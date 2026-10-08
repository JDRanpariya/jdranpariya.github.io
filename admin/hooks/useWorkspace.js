import React, { useCallback, useEffect, useRef, useState } from "react";
import { parseDocument } from "../../scripts/admin-renderer.mjs";
import { sourceUrl } from "../../scripts/admin-authoring.mjs";
import { buildFileTree } from "../../scripts/admin-renderer.mjs";
import {
  readDrafts,
  saveDraft,
  forgetDraft,
  readLayout,
  saveLayout,
  storedPhotos,
  storePhoto,
} from "../lib/storage.js";
import { encodePhoto } from "../lib/media.js";
import { galleryBlockAtCursor } from "../../scripts/gallery-data.mjs";
import { draftConflicts, publishedCurrent, conflictedCurrent } from "../lib/conflict.js";

export function completeRepository(payload, label = "Repository") {
  if (payload.truncated)
    throw new Error(
      `${label} file list is incomplete. Nothing was hidden intentionally. Reload or reduce the repository tree before editing.`
    );
  return payload;
}

export function hydrateFileMetadata(files, manifest) {
  const metadata = new Map(
    (manifest.collections?.all || []).map((item) => [
      item.inputPath.replace(/^\.\//, ""),
      { data: item.data, url: item.url },
    ])
  );
  return files.map((file) => ({
    ...file,
    publicUrl: metadata.get(file.path)?.url,
    frontmatter: { ...metadata.get(file.path)?.data, ...file.frontmatter },
  }));
}

export async function optionalPhotos(load, warn) {
  try {
    return await load();
  } catch (error) {
    warn(`Photos are unavailable: ${error.message}. Text editing is still available.`);
    return [];
  }
}

export function useWorkspace() {
  const [session, setSession] = useState(null),
    [loading, setLoading] = useState(true),
    [status, setStatus] = useState(""),
    [files, setFiles] = useState([]),
    [routes, setRoutes] = useState([]),
    [manifest, setManifest] = useState({ collections: {} }),
    [imageMap, setImageMap] = useState({}),
    [photos, setPhotos] = useState([]),
    [library, setLibrary] = useState([]),
    [current, setCurrent] = useState(null),
    [layout, setLayout] = useState(readLayout),
    [query, setQuery] = useState(""),
    [creation, setCreation] = useState(null),
    [selection, setSelection] = useState(null),
    [linkSelection, setLinkSelection] = useState(null),
    [showMedia, setShowMedia] = useState(false),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState("files"),
    [password, setPassword] = useState("");
  const textarea = useRef(null),
    workspace = useRef(null),
    request = useRef(0),
    currentRef = useRef(null),
    openRef = useRef(null),
    urls = useRef(new Map());
  currentRef.current = current;
  const notify = useCallback((message) => setStatus(message), []);
  const api = useCallback(
    async (path, options = {}) => {
      const response = await fetch(`/api/admin${path}`, {
        ...options,
        credentials: "same-origin",
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.method && options.method !== "GET" ? { "X-CSRF-Token": session?.csrf } : {}),
          ...options.headers,
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setSession({ authenticated: false });
        throw new Error("Your session ended. Sign in again; browser drafts are preserved.");
      }
      if (!response.ok)
        throw Object.assign(new Error(payload.error || `Request failed (${response.status}).`), {
          status: response.status,
        });
      return payload;
    },
    [session?.csrf]
  );
  function publicUrl(path) {
    if (path.startsWith("apps/research/")) return sourceUrl(path);
    const file = files.find((file) => file.path === path);
    return file?.frontmatter?.permalink || file?.publicUrl || sourceUrl(path);
  }
  function linkUrl(path, from) {
    const url = publicUrl(path);
    return from.startsWith("apps/research/") && url.startsWith("/")
      ? `https://jdranpariya.com${url}`
      : url;
  }
  function change(content) {
    const active = currentRef.current;
    if (!active) return;
    let draftSaved = true;
    try {
      saveDraft(active.path, content, active.conflict ? active.draftSha : active.sha);
    } catch {
      draftSaved = false;
      notify("Browser storage is unavailable. Keep a copy before leaving.");
    }
    const next = {
      ...active,
      content,
      draftSaved,
      dirty: content !== active.remoteContent || !active.sha,
    };
    currentRef.current = next;
    setCurrent(next);
    try {
      const frontmatter = parseDocument(content).frontmatter;
      setFiles((prev) =>
        prev.map((file) => (file.path === active.path ? { ...file, frontmatter } : file))
      );
    } catch {
      /* Keep the last valid metadata while typing. */
    }
  }
  async function open(path) {
    if (busy) return;
    if (linkSelection) {
      if (linkSelection.path === path) {
        notify("Choose a different note.");
        return;
      }
      const from = currentRef.current;
      if (from?.path !== linkSelection.path || from.content !== linkSelection.source) {
        notify("The selection changed. Select it again.");
        setLinkSelection(null);
        return;
      }
      change(
        from.content.slice(0, linkSelection.start) +
          `[${linkSelection.text}](${linkUrl(path, from.path)})` +
          from.content.slice(linkSelection.end)
      );
      setLinkSelection(null);
      notify("Linked. Publish the source note when ready.");
      return;
    }
    const id = ++request.current;
    try {
      const known = files.find((file) => file.path === path),
        draft = readDrafts()[path];
      const remote = known?.localOnly
        ? { path, sha: null, content: "" }
        : await api(`/file?path=${encodeURIComponent(path)}`);
      if (id !== request.current) return;
      const content = draft?.content ?? remote.content;
      setCurrent({
        path,
        sha: remote.sha,
        draftSha: draft?.sha,
        remoteContent: remote.content,
        content,
        draftSaved: Boolean(draft),
        dirty: content !== remote.content || !remote.sha,
        conflict: draftConflicts(draft, remote),
      });
      try {
        const frontmatter = parseDocument(content).frontmatter;
        setFiles((prev) =>
          prev.map((file) => (file.path === path ? { ...file, frontmatter } : file))
        );
      } catch {}
      setSelection(null);
      setShowMedia(false);
      setMobile("edit");
      setLayout((prev) => ({ ...prev, hidden: prev.hidden.filter((panel) => panel !== "edit") }));
      localStorage.setItem("site-admin-last-file", path);
      notify("Ready.");
    } catch (e) {
      notify(e.message);
    }
  }
  openRef.current = open;
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const auth = await api("/session");
        if (cancelled) return;
        setSession(auth);
        if (!auth.authenticated) return;
        const [repository, pageRoutes, images, data, media, pending] = await Promise.all([
          api("/files").then((payload) => completeRepository(payload)),
          fetch("/assets/admin-routes.json").then((r) => {
            if (!r.ok) throw new Error("The page index is missing. Rebuild the site.");
            return r.json();
          }),
          fetch("/assets/admin-image-map.json").then((r) => r.json()),
          fetch("/assets/admin-post-data.json").then((r) => r.json()),
          auth.features?.mediaPublish
            ? optionalPhotos(
                () =>
                  api("/media").then(
                    (payload) => completeRepository(payload, "Photo library").files
                  ),
                notify
              )
            : Promise.resolve([]),
          optionalPhotos(storedPhotos, notify),
        ]);
        if (cancelled) return;
        const drafts = readDrafts(),
          merged = hydrateFileMetadata(repository.files, data);
        for (const [path, draft] of Object.entries(drafts))
          if (
            !merged.some((file) => file.path === path) &&
            /^(src|apps\/research\/content)\/.+\.md$/.test(path)
          ) {
            let frontmatter = {};
            try {
              frontmatter = parseDocument(draft.content).frontmatter;
            } catch {}
            merged.push({ path, sha: draft.sha, localOnly: !draft.sha, frontmatter });
          }
        setFiles(merged);
        setRoutes(pageRoutes);
        setManifest(data);
        setLibrary(
          media.filter(
            (file) => images[`/${file.path}`] || file.path.startsWith("assets/images/uploads/")
          )
        );
        for (const file of media)
          if (file.path.startsWith("assets/images/uploads/") && !images[`/${file.path}`])
            images[`/${file.path}`] = `/api/admin/photo?path=${encodeURIComponent(file.path)}`;
        setPhotos(pending);
        for (const photo of pending) {
          const url = URL.createObjectURL(photo.blob);
          urls.current.set(photo.path, url);
          images[`/${photo.path}`] = url;
        }
        setImageMap(images);
        const last = localStorage.getItem("site-admin-last-file");
        if (merged.some((file) => file.path === last)) {
          const known = merged.find((file) => file.path === last),
            draft = drafts[last],
            remote = known.localOnly
              ? { sha: null, content: "" }
              : await api(`/file?path=${encodeURIComponent(last)}`);
          if (!cancelled) {
            const content = draft?.content ?? remote.content;
            setCurrent({
              path: last,
              sha: remote.sha,
              draftSha: draft?.sha,
              remoteContent: remote.content,
              content,
              draftSaved: Boolean(draft),
              dirty: content !== remote.content || !remote.sha,
              conflict: draftConflicts(draft, remote),
            });
          }
        }
      } catch (e) {
        if (!cancelled) notify(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    try {
      saveLayout(layout);
    } catch {}
  }, [layout]);
  useEffect(
    () => () => {
      for (const url of urls.current.values()) URL.revokeObjectURL(url);
    },
    []
  );
  useEffect(() => {
    const save = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        const file = currentRef.current;
        if (file) {
          try {
            saveDraft(file.path, file.content, file.conflict ? file.draftSha : file.sha);
            setCurrent((active) =>
              active?.path === file.path && active.content === file.content
                ? { ...active, draftSaved: true }
                : active
            );
            notify("Draft saved in this browser.");
          } catch {
            setCurrent((active) =>
              active?.path === file.path && active.content === file.content
                ? { ...active, draftSaved: false }
                : active
            );
            notify("Browser storage is unavailable. Keep a copy before leaving.");
          }
        }
      }
    };
    window.addEventListener("keydown", save);
    return () => window.removeEventListener("keydown", save);
  }, []);
  function toggle(panel) {
    setLayout((prev) => {
      const hidden = prev.hidden.includes(panel)
        ? prev.hidden.filter((p) => p !== panel)
        : [...prev.hidden, panel];
      if (hidden.length === 3) {
        notify("Keep at least one panel open.");
        return prev;
      }
      return { ...prev, hidden };
    });
  }
  function captureSelection(event) {
    const e = event.target;
    setSelection({
      path: current?.path,
      start: e.selectionStart,
      end: e.selectionEnd,
      text: e.value.slice(e.selectionStart, e.selectionEnd),
      source: e.value,
    });
  }
  function createIn(directory, kind, selected = null) {
    setCreation({ directory, kind, selection: selected });
    setLayout((prev) => ({ ...prev, hidden: prev.hidden.filter((p) => p !== "files") }));
    setMobile("files");
  }
  function created(path, content, selected) {
    try {
      if (selected && currentRef.current?.path === selected.path) {
        const active = currentRef.current;
        if (active.content !== selected.source)
          throw new Error("The selection changed. Select it again.");
        content += `> From [source](${linkUrl(selected.path, path)})\n>\n> ${selected.text.replaceAll("\n", "\n> ")}\n`;
        change(
          active.content.slice(0, selected.start) +
            `[${selected.text}](${linkUrl(path, selected.path)})` +
            active.content.slice(selected.end)
        );
      }
      saveDraft(path, content, null);
      setFiles((prev) => [
        ...prev,
        { path, localOnly: true, frontmatter: parseDocument(content).frontmatter },
      ]);
      setCurrent({ path, sha: null, content, remoteContent: "", dirty: true, draftSaved: true });
      setQuery("");
      setCreation(null);
      setMobile("edit");
      setLayout((prev) => ({
        ...prev,
        folders: {},
        hidden: prev.hidden.filter((panel) => panel !== "edit"),
      }));
      notify("Created a browser draft. Nothing is published yet.");
    } catch (e) {
      notify(e.message);
    }
  }
  async function rememberPhoto(photo) {
    await storePhoto(photo);
    const url = urls.current.get(photo.path) || URL.createObjectURL(photo.blob);
    urls.current.set(photo.path, url);
    setPhotos((prev) => [...prev.filter((item) => item.path !== photo.path), photo]);
    setImageMap((prev) => ({ ...prev, [`/${photo.path}`]: url }));
    return { ...photo, url };
  }
  function insertPhotos(markdown) {
    const active = currentRef.current;
    if (
      !active ||
      !selection ||
      selection.path !== active.path ||
      selection.source !== active.content
    )
      throw new Error("Click the insertion point in the Markdown, then insert the photos again.");
    const startOfBody = active.content.match(/^---\s*\n[\s\S]*?\n---\s*\n/)?.[0].length || 0;
    if (selection.start < startOfBody)
      throw new Error("Place the cursor in the post body, below the frontmatter.");
    const block = galleryBlockAtCursor(active.content, selection.start);
    change(
      active.content.slice(0, block?.start ?? selection.start) +
        markdown +
        active.content.slice(block?.end ?? selection.end)
    );
    setShowMedia(false);
    notify("Photo block inserted in your draft. Publish when ready.");
  }
  async function publish() {
    if (busy || session?.readOnly || !current?.dirty || current?.conflict) return;
    setBusy(true);
    const active = current;
    try {
      const media = await Promise.all(
        photos
          .filter((photo) => !photo.published && active.content.includes(`/${photo.path}`))
          .map(encodePhoto)
      );
      if (media.length && !session.features?.mediaPublish)
        throw new Error(
          "The admin service needs its media update before publishing photos. Your draft and photos are saved in this browser."
        );
      const result = await api("/file", {
        method: "PUT",
        body: JSON.stringify({
          path: active.path,
          content: active.content,
          sha: active.sha,
          media,
          message: `${active.sha ? "update" : "add"} ${active.path.split("/").at(-1).replace(/\.md$/, "")}`,
        }),
      });
      const latest = currentRef.current;
      const next = publishedCurrent(active, latest, result.sha);
      let storageWarning = "";
      try {
        if (next?.path === active.path && next.dirty)
          saveDraft(active.path, next.content, result.sha);
        else forgetDraft(active.path);
      } catch {
        storageWarning = " Browser storage is unavailable. Keep a copy of any remaining edits.";
      }
      const saved = new Set(media.map((photo) => photo.path));
      setPhotos((prev) =>
        prev.map((photo) => (saved.has(photo.path) ? { ...photo, published: true } : photo))
      );
      for (const photo of photos)
        if (saved.has(photo.path)) storePhoto({ ...photo, published: true }).catch(() => {});
      if (latest?.path === active.path) {
        const updated = { ...next, draftSaved: !storageWarning };
        currentRef.current = updated;
        setCurrent(updated);
      }
      setFiles((prev) =>
        prev.map((file) =>
          file.path === active.path ? { ...file, sha: result.sha, localOnly: false } : file
        )
      );
      notify(
        (active.path.startsWith("apps/research")
          ? "Saved to GitHub. Research pages need a research build and deployment."
          : "Saved to GitHub. The site deployment has started.") +
          (next?.path === active.path && next.dirty ? " Your later edits remain a draft." : "") +
          storageWarning
      );
    } catch (e) {
      if (e.status === 409) {
        try {
          const remote = await api(`/file?path=${encodeURIComponent(active.path)}`);
          const latest = currentRef.current;
          if (latest?.path === active.path) {
            const next = conflictedCurrent(active, latest, remote);
            currentRef.current = next;
            setCurrent(next);
            notify(
              "The repository changed. Your draft is preserved. Review the current source before retrying."
            );
          } else notify("The repository changed. Reopen the file to review your preserved draft.");
        } catch (reviewError) {
          notify(`${e.message} Could not load the current source: ${reviewError.message}`);
        }
      } else notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  const editingGallery =
    current && selection && selection.path === current.path
      ? galleryBlockAtCursor(current.content, selection.start)
      : null;
  return {
    session,
    setSession,
    loading,
    status,
    files,
    routes,
    manifest,
    imageMap,
    photos,
    library,
    current,
    setCurrent,
    layout,
    setLayout,
    query,
    setQuery,
    creation,
    setCreation,
    selection,
    linkSelection,
    setLinkSelection,
    showMedia,
    setShowMedia,
    busy,
    mobile,
    setMobile,
    password,
    setPassword,
    textarea,
    workspace,
    urls,
    notify,
    api,
    publicUrl,
    open,
    openRef,
    captureSelection,
    change,
    created,
    createIn,
    rememberPhoto,
    insertPhotos,
    publish,
    editingGallery,
    toggle,
  };
}
