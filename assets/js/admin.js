(function () {
  "use strict";

  const API = "/api/admin";
  const DRAFT_KEY = "site-admin-drafts-v1";
  const LAYOUT_KEY = "site-admin-layout-v2";
  const els = {};
  const state = {
    csrf: "",
    files: [],
    current: null,
    linkSelection: null,
    createSelection: null,
    statusTimer: null,
    draftTimer: null,
    pathWasEdited: false,
    createKind: "file",
    routes: [],
    openRequest: 0,
    layout: { filesWidth: 260, ratio: 0.5, hidden: [], folders: {}, order: [] },
    previewTimer: null,
    previewReady: false,
    publishing: false,
    readOnly: false,
    imageMap: {},
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
  }

  function drafts() {
    try {
      const value = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (error) {
      return {};
    }
  }

  function writeDraft(path, content, sha) {
    const stored = drafts();
    stored[path] = { content, sha: sha || null, updatedAt: new Date().toISOString() };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(stored));
      return true;
    } catch {
      showStatus(
        "Browser storage is unavailable. Keep a copy of your draft before leaving.",
        "error"
      );
      return false;
    }
  }

  function removeDraft(path) {
    const stored = drafts();
    delete stored[path];
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(stored));
    } catch {
      /* Publishing already succeeded; browser cleanup is optional. */
    }
  }

  function showStatus(message, kind = "") {
    clearTimeout(state.statusTimer);
    els.status.textContent = message;
    els.status.dataset.kind = kind;
    els.status.classList.add("is-visible");
    // Persistent, inline status: errors should not disappear before they are read.
  }

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    if (options.method && options.method !== "GET") headers["X-CSRF-Token"] = state.csrf;
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers,
      credentials: "same-origin",
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
      showLogin();
      throw new Error("Your admin session ended. Sign in again.");
    }
    if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
    return payload;
  }

  function publicUrl(path) {
    if (path.startsWith("apps/research/content/")) return window.AdminRenderer.sourceUrl(path);
    const file = state.files.find((file) => file.path === path);
    return file?.frontmatter?.permalink || window.AdminRenderer.sourceUrl(path);
  }

  function linkUrl(path, fromPath) {
    const url = publicUrl(path);
    return fromPath.startsWith("apps/research/content/") && url.startsWith("/")
      ? `https://jdranpariya.com${url}`
      : url;
  }

  function fileLabel(path) {
    return path.split("/").pop().replace(/\.md$/, "").replaceAll("-", " ");
  }

  function saveLayout() {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(state.layout));
    } catch {
      /* Session layout still works. */
    }
  }

  function applyLayout() {
    const hidden = state.layout.hidden;
    ["files", "edit", "preview"].forEach((panel) => {
      els.workspace.dataset[`${panel}Hidden`] = String(hidden.includes(panel));
      document
        .querySelector(`[data-panel-toggle="${panel}"]`)
        .setAttribute("aria-pressed", String(!hidden.includes(panel)));
    });
    els.workspace.style.setProperty("--files-width", `${state.layout.filesWidth}px`);
    els.workspace.style.setProperty("--editor-share", `${state.layout.ratio}fr`);
    els.workspace.style.setProperty("--preview-share", `${1 - state.layout.ratio}fr`);
    $("admin-files-divider").setAttribute(
      "aria-valuenow",
      String(Math.round(state.layout.filesWidth))
    );
    $("admin-preview-divider").setAttribute(
      "aria-valuenow",
      String(Math.round(state.layout.ratio * 100))
    );
  }

  function initializeLayout() {
    try {
      const stored = JSON.parse(localStorage.getItem(LAYOUT_KEY) || "null");
      if (stored)
        state.layout = {
          ...state.layout,
          ...stored,
          filesWidth: Math.max(180, Math.min(420, Number(stored.filesWidth) || 260)),
          ratio: Math.max(0.25, Math.min(0.75, Number(stored.ratio) || 0.5)),
          hidden: Array.isArray(stored.hidden)
            ? stored.hidden.filter((p) => ["files", "edit", "preview"].includes(p)).slice(0, 2)
            : [],
          folders:
            stored.folders && typeof stored.folders === "object" && !Array.isArray(stored.folders)
              ? stored.folders
              : {},
          order: Array.isArray(stored.order)
            ? stored.order.filter((key) => typeof key === "string")
            : [],
        };
    } catch {
      /* Ignore malformed preferences. */
    }
    applyLayout();
    document.querySelectorAll("[data-panel-toggle]").forEach((button) =>
      button.addEventListener("click", () => {
        const panel = button.dataset.panelToggle;
        if (state.layout.hidden.includes(panel))
          state.layout.hidden = state.layout.hidden.filter((p) => p !== panel);
        else {
          if (state.layout.hidden.length === 2) {
            showStatus("Keep at least one panel open.");
            return;
          }
          state.layout.hidden.push(panel);
        }
        applyLayout();
        saveLayout();
      })
    );
    $("admin-reset-layout").addEventListener("click", () => {
      state.layout.filesWidth = 260;
      state.layout.ratio = 0.5;
      state.layout.hidden = [];
      applyLayout();
      saveLayout();
    });
    for (const id of ["admin-files-divider", "admin-preview-divider"]) {
      const divider = $(id);
      const update = (clientX) => {
        const rect = els.workspace.getBoundingClientRect();
        if (id === "admin-files-divider")
          state.layout.filesWidth = Math.max(
            180,
            Math.min(420, rect.width * 0.4, clientX - rect.left)
          );
        else {
          const files = state.layout.hidden.includes("files")
            ? 0
            : $("admin-files-divider").getBoundingClientRect().right - rect.left;
          state.layout.ratio = Math.max(
            0.25,
            Math.min(0.75, (clientX - rect.left - files) / Math.max(1, rect.width - files - 6))
          );
        }
        applyLayout();
      };
      divider.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        divider.setPointerCapture(event.pointerId);
        els.workspace.classList.add("is-resizing");
      });
      divider.addEventListener("pointermove", (event) => {
        if (divider.hasPointerCapture(event.pointerId)) update(event.clientX);
      });
      const finish = () => {
        els.workspace.classList.remove("is-resizing");
        saveLayout();
      };
      divider.addEventListener("pointerup", (event) => {
        if (divider.hasPointerCapture(event.pointerId))
          divider.releasePointerCapture(event.pointerId);
        finish();
      });
      divider.addEventListener("pointercancel", finish);
      divider.addEventListener("lostpointercapture", finish);
      divider.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        if (id === "admin-files-divider")
          state.layout.filesWidth =
            event.key === "Home"
              ? 180
              : event.key === "End"
                ? 420
                : Math.max(180, Math.min(420, state.layout.filesWidth + direction * 20));
        else
          state.layout.ratio =
            event.key === "Home"
              ? 0.25
              : event.key === "End"
                ? 0.75
                : Math.max(0.25, Math.min(0.75, state.layout.ratio + direction * 0.05));
        applyLayout();
        saveLayout();
      });
      divider.addEventListener("dblclick", () => {
        if (id === "admin-files-divider") state.layout.filesWidth = 260;
        else state.layout.ratio = 0.5;
        applyLayout();
        saveLayout();
      });
    }
  }

  function sanitizePreview(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc
      .querySelectorAll(
        "script,iframe,object,embed,form,input:not([type=checkbox]),button,meta,link,base,style,foreignObject"
      )
      .forEach((node) => node.remove());
    doc.querySelectorAll("*").forEach((node) => {
      for (const attribute of [...node.attributes]) {
        const name = attribute.name.toLowerCase();
        if (name.startsWith("on") || ["srcdoc", "formaction", "srcset", "action"].includes(name))
          node.removeAttribute(attribute.name);
        if (["href", "src", "xlink:href"].includes(name)) {
          let value = attribute.value.trim();
          if (name === "src") {
            const source = value.replace(/^(?:\.\.\/)+/, "").replace(/^assets\//, "/assets/");
            value = state.imageMap[source] || value;
          }
          let url;
          try {
            url = new URL(value, new URL(publicUrl(state.current.path) || "/", location.origin));
          } catch {
            node.removeAttribute(attribute.name);
            continue;
          }
          const allowed =
            name === "src"
              ? url.origin === location.origin || /^data:image\/(png|jpeg|gif|webp);/i.test(value)
              : ["https:", "http:", "mailto:"].includes(url.protocol) || value.startsWith("#");
          if (!allowed) node.removeAttribute(attribute.name);
          else if (name === "src") node.setAttribute("src", url.href);
        }
      }
      if (node.tagName === "INPUT") node.disabled = true;
    });
    return doc.body.innerHTML;
  }

  function renderPreview() {
    if (!state.previewReady || !state.current) return;
    try {
      const result = window.AdminRenderer.renderDocument(
        els.source.value,
        state.current.path,
        state.files
      );
      const currentFile = state.files.find((file) => file.path === state.current.path);
      if (currentFile) currentFile.frontmatter = result.frontmatter;
      const doc = els.preview.contentDocument;
      const main = doc.getElementById("preview-page");
      main.className = `admin-preview-page${result.research ? " admin-research-page" : ""}`;
      main.innerHTML = sanitizePreview(result.html);
      els.previewLabel.textContent = result.research
        ? "Research · draft preview"
        : "Personal site · draft preview";
      els.previewNotice.textContent =
        result.warnings.join(" ") ||
        (result.frontmatter.folderIndex
          ? "Folder index. Child drafts appear here; only published children appear on the live site."
          : "Live draft. Changes here are not published.");
    } catch (error) {
      els.previewNotice.textContent = `Preview error: ${error.message}. The last valid preview is kept.`;
    }
    const url = publicUrl(state.current.path);
    if (url) {
      els.publicLink.href = url;
      els.publicLink.hidden = false;
    } else {
      els.publicLink.hidden = true;
    }
  }

  function markDirty() {
    if (!state.current) return;
    state.current.content = els.source.value;
    state.current.dirty = state.current.content !== state.current.remoteContent;
    els.draftState.textContent = state.current.dirty
      ? "Draft saved in this browser"
      : "Published version";
    els.publish.disabled =
      state.readOnly || !state.current.dirty || state.current.conflict || state.publishing;
    clearTimeout(state.draftTimer);
    const current = state.current;
    if (!writeDraft(current.path, current.content, current.sha))
      els.draftState.textContent = "Unsaved draft · browser storage unavailable";
    state.draftTimer = setTimeout(renderFileList, 350);
    clearTimeout(state.previewTimer);
    state.previewTimer = setTimeout(renderPreview, 180);
  }

  function selectedText() {
    if (!state.current || els.source.selectionStart === els.source.selectionEnd) return null;
    const start = els.source.selectionStart;
    const end = els.source.selectionEnd;
    const text = els.source.value.slice(start, end);
    if (!text.trim()) return null;
    return { path: state.current.path, start, end, text };
  }

  function updateSelectionActions() {
    const hasSelection = !state.publishing && Boolean(selectedText());
    els.createLinked.disabled = !hasSelection;
    els.linkExisting.disabled = !hasSelection;
  }

  function renderFileList() {
    const query = els.fileSearch.value.trim().toLowerCase();
    const storedDrafts = drafts();
    const scroll = els.fileList.scrollTop;
    const focusedPath = document.activeElement?.dataset.filePath;
    const tree = window.AdminRenderer.buildFileTree(state.files, query);
    const count = (node) =>
      node.files.length +
      [...node.directories.values()].reduce((sum, next) => sum + count(next), 0);
    const renderNode = (node, depth = 0) => {
      const directories = [...node.directories.values()].sort((a, b) => {
        const order = state.layout.order;
        const rank = (key) => (order.includes(key) ? order.indexOf(key) : 1000);
        return rank(a.key) - rank(b.key) || a.name.localeCompare(b.name);
      });
      return (
        directories
          .map((folder) => {
            const open = query || state.layout.folders[folder.key] !== false;
            const editable =
              (folder.path.startsWith("src") && !folder.path.startsWith("src/now")) ||
              folder.path.startsWith("apps/research/content");
            const actions = editable
              ? `<div class="admin-folder-actions"><button class="admin-folder-action" type="button" data-create-kind="file" data-create-directory="${escapeHtml(folder.path)}" aria-label="New file in ${escapeHtml(folder.path)}" title="New file here"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true"><path d="M4 2h8l4 4v12H4zM12 2v5h4M7 12h6M10 9v6"/></svg></button><button class="admin-folder-action" type="button" data-create-kind="folder" data-create-directory="${escapeHtml(folder.path)}" aria-label="New folder in ${escapeHtml(folder.path)}" title="New folder here"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true"><path d="M2 5h6l2 2h8v10H2zM7 12h6M10 9v6"/></svg></button></div>`
              : "";
            return `<div class="admin-folder-group"><details class="admin-folder" data-folder="${escapeHtml(folder.key)}"${depth === 0 ? ' data-root="true"' : ""}${open ? " open" : ""}><summary draggable="true" title="Drag to reorder folders; Alt + Arrow Up/Down also works"><span class="admin-folder-name">${escapeHtml(folder.name)}</span><span class="admin-folder-count">${count(folder)}</span></summary>${renderNode(folder, depth + 1)}</details>${actions}</div>`;
          })
          .join("") +
        node.files
          .map((file) => {
            const active = state.current?.path === file.path ? ' aria-current="page"' : "";
            const draft = storedDrafts[file.path] ? ' data-draft="true"' : "";
            return `<button class="admin-file-button" type="button" title="${escapeHtml(file.path)}" data-file-path="${escapeHtml(file.path)}"${active}${draft}>${escapeHtml(file.path.split("/").pop())}${draft ? '<span class="sr-only">, local draft</span>' : ""}</button>`;
          })
          .join("")
      );
    };
    els.fileList.innerHTML =
      renderNode(tree) || '<p class="admin-file-empty">No matching files.</p>';
    els.fileList.scrollTop = scroll;
    if (focusedPath)
      [...els.fileList.querySelectorAll("[data-file-path]")]
        .find((button) => button.dataset.filePath === focusedPath)
        ?.focus({ preventScroll: true });
  }

  async function openFile(path) {
    if (state.publishing) {
      showStatus("Wait for the current publish to finish.");
      return;
    }
    const request = ++state.openRequest;
    showStatus(`Opening ${fileLabel(path)}…`);
    if (state.linkSelection) {
      applyExistingLink(path);
      return;
    }
    const known = state.files.find((file) => file.path === path);
    let remote;
    if (known?.localOnly) {
      const draft = drafts()[path];
      remote = { path, sha: null, content: draft?.content || "" };
    } else {
      remote = await api(`/file?path=${encodeURIComponent(path)}`);
    }
    if (request !== state.openRequest) return;
    const draft = drafts()[path];
    const useDraft = draft && (!draft.sha || draft.sha === remote.sha);
    const content = draft ? draft.content : remote.content;
    state.current = {
      path,
      sha: remote.sha || null,
      content,
      remoteContent: remote.content,
      dirty: content !== remote.content || !remote.sha,
    };
    els.source.disabled = false;
    els.source.value = content;
    els.source.scrollTop = 0;
    els.filePath.textContent = path;
    els.draftState.textContent = state.current.dirty
      ? "Draft saved in this browser"
      : "Published version";
    els.publish.disabled = state.readOnly || !state.current.dirty;
    els.conflictNotice.hidden = !(draft && !useDraft);
    els.conflictSource.textContent = remote.content;
    updateSelectionActions();
    renderPreview();
    renderFileList();
    setMobilePanel("edit");
    try {
      localStorage.setItem("site-admin-last-file", path);
    } catch {
      /* Optional preference. */
    }
    showStatus(
      draft && !useDraft
        ? "The published file changed since this draft was saved. Your draft is preserved; publishing requires reviewing the newer version first."
        : "Ready. Drag the dividers to resize panels."
    );
    if (draft && !useDraft) {
      state.current.conflict = true;
      els.publish.disabled = true;
    }
  }

  function replaceSelection(selection, replacement) {
    if (state.publishing) throw new Error("Wait for publishing to finish before editing.");
    const draft = drafts()[selection.path];
    const sourceContent =
      state.current?.path === selection.path ? els.source.value : draft?.content;
    if (typeof sourceContent !== "string")
      throw new Error("The source draft is no longer available.");
    const updated = `${sourceContent.slice(0, selection.start)}${replacement}${sourceContent.slice(selection.end)}`;
    const sourceFile = state.files.find((file) => file.path === selection.path);
    writeDraft(selection.path, updated, sourceFile?.sha || null);
    if (state.current?.path === selection.path) {
      els.source.value = updated;
      state.current.content = updated;
      state.current.dirty = true;
      els.publish.disabled = state.readOnly || state.current.conflict;
      els.draftState.textContent = "Draft saved in this browser";
      renderPreview();
    }
  }

  async function applyExistingLink(targetPath) {
    const selection = state.linkSelection;
    if (!selection) return;
    if (targetPath === selection.path) {
      showStatus("Choose a different note.", "error");
      return;
    }
    const url = linkUrl(targetPath, selection.path);
    if (!url) {
      showStatus("That file does not have a public page URL.", "error");
      return;
    }
    replaceSelection(selection, `[${selection.text}](${url})`);
    state.linkSelection = null;
    els.linkNotice.hidden = true;
    renderFileList();
    await openFile(selection.path);
    showStatus("Linked the selection. Publish the source note when ready.", "success");
  }

  function updateCreateTarget() {
    const folder = state.createKind === "folder";
    const name = els.newPath.value.trim();
    const section = window.AdminRenderer.documentSection(`${els.newDirectory.value}/entry.md`);
    els.newHelp.textContent = folder
      ? "Creates index.md with automatic child links. Saved as a local draft; set status to published when ready to make it live."
      : `The folder supplies the page type. Filename sets the URL. Saved locally; set status to ${section === "projects" && els.newTemplate.value !== "blank" ? "active" : "published"} when ready to make it live.`;
    els.newAuthorField.hidden = folder || els.newTemplate.value === "blank" || section !== "books";
    try {
      const path = window.AdminRenderer.creationPath(
        els.newDirectory.value,
        name,
        state.createKind
      );
      els.newTarget.textContent = `${path} → ${publicUrl(path)}`;
      els.newCreate.disabled = false;
    } catch (error) {
      els.newTarget.textContent = name ? error.message : "Choose a title and a name.";
      els.newCreate.disabled = true;
    }
  }

  function openCreate(selection = null, directory = null, kind = "file") {
    if (state.publishing) return;
    state.createSelection = selection;
    state.createKind = kind;
    state.pathWasEdited = false;
    els.create.hidden = false;
    els.newTemplate.value = "auto";
    const directories = window.AdminRenderer.sourceDirectories(state.files);
    els.newDirectory.innerHTML = directories
      .map(
        (path) =>
          `<option value="${escapeHtml(path)}">${escapeHtml(path.startsWith("src") ? `Personal site / ${path.slice(4)}` : `Research site / ${path.slice("apps/research/content/".length)}`)}</option>`
      )
      .join("");
    const currentDirectory = state.current?.path
      ? state.current.path.slice(0, state.current.path.lastIndexOf("/"))
      : "src";
    els.newDirectory.value =
      directory || (directories.includes(currentDirectory) ? currentDirectory : "src");
    els.newTitle.value = selection?.text.trim().replace(/\s+/g, " ").slice(0, 80) || "";
    els.newPath.value = slugify(els.newTitle.value);
    els.newAuthor.value = "";
    els.createHeading.textContent = kind === "folder" ? "New folder" : "New file";
    els.newNameLabel.textContent = kind === "folder" ? "Folder name" : "File name";
    els.newTemplateField.hidden = kind === "folder";
    els.newCreate.textContent = kind === "folder" ? "Create folder" : "Create draft";
    updateCreateTarget();
    document.querySelector('[data-panel-toggle="files"]').setAttribute("aria-pressed", "true");
    state.layout.hidden = state.layout.hidden.filter((panel) => panel !== "files");
    applyLayout();
    els.newTitle.focus();
    els.newTitle.select();
    setMobilePanel("files");
  }

  function closeCreate() {
    els.create.hidden = true;
    state.createSelection = null;
  }

  async function createDraft() {
    if (state.publishing) return;
    const title = els.newTitle.value.trim();
    if (!title) {
      showStatus("Enter a title.", "error");
      return;
    }
    const path = window.AdminRenderer.creationPath(
      els.newDirectory.value,
      els.newPath.value.trim(),
      state.createKind
    );
    const url = publicUrl(path);
    const folderPath = path.replace(/\/index\.md$/, "");
    if (
      state.files.some((file) => file.path === path || publicUrl(file.path) === url) ||
      state.routes.includes(url) ||
      (state.createKind === "folder" &&
        window.AdminRenderer.sourceDirectories(state.files).includes(folderPath))
    ) {
      showStatus(
        "A file, folder or page already uses that name or URL. Choose another name.",
        "error"
      );
      return;
    }
    if (!els.newAuthorField.hidden && !els.newAuthor.value.trim()) {
      showStatus("Enter the book author.", "error");
      els.newAuthor.focus();
      return;
    }
    const selection = state.createSelection;
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    let content = window.AdminRenderer.newDocument({
      path,
      title,
      kind: state.createKind,
      template: els.newTemplate.value,
      author: els.newAuthor.value.trim(),
      date,
    });
    if (selection) {
      const sourceLink = linkUrl(selection.path, path);
      content += `> From [source](${sourceLink})\n>\n> ${selection.text.replaceAll("\n", "\n> ")}\n\n`;
    }
    if (!writeDraft(path, content, null)) return;
    if (selection) {
      replaceSelection(selection, `[${selection.text}](${linkUrl(path, selection.path)})`);
    }
    state.files.push({
      path,
      sha: null,
      size: content.length,
      localOnly: true,
      frontmatter: window.AdminRenderer.parseDocument(content).frontmatter,
    });
    state.files.sort((a, b) => a.path.localeCompare(b.path));
    els.fileSearch.value = "";
    const research = path.startsWith("apps/research/content/");
    const parts = path.split("/").slice(research ? 3 : 1, -1);
    let key = research ? "Research site" : "Personal site";
    state.layout.folders[key] = true;
    parts.forEach((part) => {
      key += `/${part}`;
      state.layout.folders[key] = true;
    });
    saveLayout();
    const kind = state.createKind;
    closeCreate();
    await openFile(path);
    showStatus(
      kind === "folder"
        ? "Folder created with index.md. Use its New file action to add children. Nothing is published yet."
        : "New draft created in the selected folder. Nothing is published yet.",
      "success"
    );
  }

  async function publish() {
    if (
      state.readOnly ||
      !state.current ||
      !state.current.dirty ||
      state.current.conflict ||
      state.publishing
    )
      return;
    state.publishing = true;
    els.newButton.disabled = true;
    els.newCreate.disabled = true;
    updateSelectionActions();
    const content = els.source.value;
    els.source.readOnly = true;
    els.publish.disabled = true;
    els.publish.textContent = "Publishing…";
    try {
      const result = await api("/file", {
        method: "PUT",
        body: JSON.stringify({
          path: state.current.path,
          content,
          sha: state.current.sha,
          message: `${state.current.sha ? "update" : "add"} ${fileLabel(state.current.path)}`,
        }),
      });
      state.current.sha = result.sha;
      state.current.remoteContent = content;
      state.current.dirty = false;
      removeDraft(state.current.path);
      const known = state.files.find((file) => file.path === state.current.path);
      if (known) {
        known.sha = result.sha;
        known.localOnly = false;
      }
      els.draftState.textContent = "Published to GitHub";
      renderFileList();
      const message = state.current.path.startsWith("apps/research/content/")
        ? state.current.path === "apps/research/content/research-home.md"
          ? "Saved to GitHub. Reload the research homepage to see this version."
          : "Saved to GitHub. New research pages become live after the research site is built and deployed."
        : result.commitUrl
          ? "Published. The site deployment has started."
          : "Published to GitHub.";
      showStatus(message, "success");
    } catch (error) {
      showStatus(error.message, "error");
      els.publish.disabled = false;
    } finally {
      state.publishing = false;
      els.newButton.disabled = false;
      els.newCreate.disabled = false;
      updateSelectionActions();
      els.source.readOnly = false;
      els.publish.textContent = "Publish";
    }
  }

  function setMobilePanel(panel) {
    els.workspace.dataset.activePanel = panel;
    els.mobileTabs.querySelectorAll("[data-admin-tab]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.adminTab === panel));
    });
  }

  function showLogin() {
    els.loading.hidden = true;
    els.workspace.hidden = true;
    els.account.hidden = true;
    els.mobileTabs.hidden = true;
    els.login.hidden = false;
    const error = new URL(location.href).searchParams.get("error");
    if (error) {
      const messages = {
        "invalid-state": "The login request expired. Please try again.",
        "authorization-denied": "GitHub authorization was cancelled.",
        "account-not-allowed": "This workspace is limited to the site owner.",
        "github-auth-failed": "GitHub could not complete the login.",
        "not-configured": "Admin login is not configured yet.",
      };
      els.loginError.textContent = messages[error] || "Login could not be completed.";
      els.loginError.hidden = false;
    }
  }

  async function initialize() {
    Object.assign(els, {
      loading: $("admin-loading"),
      login: $("admin-login"),
      loginError: $("admin-login-error"),
      loginForm: $("admin-login-form"),
      password: $("admin-password"),
      loginButton: $("admin-login-button"),
      workspace: $("admin-workspace"),
      account: $("admin-account"),
      identity: $("admin-identity"),
      logout: $("admin-logout"),
      fileSearch: $("admin-file-search"),
      fileList: $("admin-file-list"),
      create: $("admin-create"),
      newButton: $("admin-new"),
      newFolderButton: $("admin-new-folder"),
      createHeading: $("admin-create-heading"),
      newDirectory: $("admin-new-directory"),
      newNameLabel: $("admin-new-name-label"),
      newTarget: $("admin-new-target"),
      newHelp: $("admin-new-help"),
      newTemplateField: $("admin-new-template-field"),
      newAuthorField: $("admin-new-author-field"),
      newAuthor: $("admin-new-author"),
      newTitle: $("admin-new-title"),
      newPath: $("admin-new-path"),
      newTemplate: $("admin-new-template"),
      newCancel: $("admin-new-cancel"),
      newCreate: $("admin-new-create"),
      source: $("admin-source"),
      filePath: $("admin-file-path"),
      draftState: $("admin-draft-state"),
      publish: $("admin-publish"),
      preview: $("admin-preview-content"),
      publicLink: $("admin-public-link"),
      createLinked: $("admin-create-linked"),
      linkExisting: $("admin-link-existing"),
      linkNotice: $("admin-link-notice"),
      linkCancel: $("admin-link-cancel"),
      mobileTabs: $("admin-mobile-tabs"),
      status: $("admin-status"),
      previewLabel: $("admin-preview-label"),
      previewNotice: $("admin-preview-notice"),
      conflictNotice: $("admin-conflict-notice"),
      conflictSource: $("admin-conflict-source"),
    });
    initializeLayout();
    fetch("/assets/admin-image-map.json")
      .then((response) => (response.ok ? response.json() : {}))
      .then((map) => {
        state.imageMap = map;
        renderPreview();
      })
      .catch(() => {
        /* Image preview remains best-effort. */
      });
    els.preview.addEventListener("load", () => {
      if (!els.preview.contentDocument?.getElementById("preview-page")) return;
      state.previewReady = true;
      els.preview.contentDocument.addEventListener("click", (event) => {
        const link = event.target.closest("a");
        if (!link) return;
        event.preventDefault();
        const href = link.getAttribute("href") || "";
        if (href.startsWith("#")) {
          els.preview.contentDocument
            .getElementById(decodeURIComponent(href.slice(1)))
            ?.scrollIntoView();
          return;
        }
        const origin = state.current?.path.startsWith("apps/research/content/")
          ? "https://research.jdranpariya.com"
          : "https://jdranpariya.com";
        const target = new URL(href, origin).href;
        const known = state.files.find(
          (file) => new URL(publicUrl(file.path), "https://jdranpariya.com").href === target
        );
        if (known) openFile(known.path).catch((error) => showStatus(error.message, "error"));
        else
          showStatus(
            "External links are disabled in draft preview. Use Open published page to follow them."
          );
      });
      renderPreview();
    });
    els.preview.srcdoc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'"><title>Draft preview</title><link rel="stylesheet" href="/css/style.css"><link rel="stylesheet" href="/assets/vendor/katex/katex.min.css"><link rel="stylesheet" href="/assets/css/admin-research-preview.css"><link rel="stylesheet" href="/assets/css/admin-preview.css"></head><body><main id="preview-page" class="admin-preview-page"><p>Choose a file to see its live draft preview.</p></main></body></html>`;
    setMobilePanel("files");

    els.loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      els.loginButton.disabled = true;
      els.loginButton.textContent = "Opening…";
      els.loginError.hidden = true;
      try {
        const response = await fetch(`${API}/auth/login`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: els.password.value }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Login failed.");
        location.replace("/admin/");
      } catch (error) {
        els.loginError.textContent = error.message;
        els.loginError.hidden = false;
        els.password.select();
        els.loginButton.disabled = false;
        els.loginButton.textContent = "Sign in";
      }
    });

    try {
      const session = await api("/session");
      if (!session.authenticated) {
        showLogin();
        return;
      }
      state.csrf = session.csrf;
      state.readOnly = Boolean(session.readOnly);
      els.identity.textContent = state.readOnly ? "Local preview" : `@${session.login}`;
      if (state.readOnly) {
        els.publish.textContent = "Preview only";
        els.logout.hidden = true;
      }
      const filesResult = await api("/files");
      state.files = filesResult.files;
      const routes = await fetch("/assets/admin-routes.json");
      if (!routes.ok)
        throw new Error("Page index unavailable. Rebuild the site before creating files.");
      state.routes = await routes.json();
      const stored = drafts();
      Object.entries(stored).forEach(([path, draft]) => {
        if (!state.files.some((file) => file.path === path)) {
          state.files.push({
            path,
            sha: draft.sha || null,
            size: draft.content?.length || 0,
            localOnly: !draft.sha,
            frontmatter: (() => {
              try {
                return window.AdminRenderer.parseDocument(draft.content).frontmatter;
              } catch {
                return {};
              }
            })(),
          });
        }
      });
      state.files.sort((a, b) => a.path.localeCompare(b.path));
      renderFileList();
      els.loading.hidden = true;
      els.login.hidden = true;
      els.workspace.hidden = false;
      els.account.hidden = false;
      els.mobileTabs.hidden = false;
      let lastPath;
      try {
        lastPath = localStorage.getItem("site-admin-last-file");
      } catch {
        /* Optional preference. */
      }
      if (state.files.some((file) => file.path === lastPath)) await openFile(lastPath);
    } catch (error) {
      if (!els.login.hidden) return;
      els.loading.textContent = error.message;
      showStatus(error.message, "error");
    }

    els.fileList.addEventListener("click", (event) => {
      const creation = event.target.closest("[data-create-kind]");
      if (creation) {
        openCreate(null, creation.dataset.createDirectory, creation.dataset.createKind);
        return;
      }
      const button = event.target.closest("[data-file-path]");
      if (button) {
        openFile(button.dataset.filePath).catch((error) => showStatus(error.message, "error"));
        return;
      }
      const summary = event.target.closest("summary");
      const folder = summary?.parentElement;
      if (!folder?.matches("[data-folder]")) return;
      event.preventDefault();
      folder.open = !folder.open;
      if (!els.fileSearch.value.trim()) {
        state.layout.folders[folder.dataset.folder] = folder.open;
        saveLayout();
      }
    });
    els.fileSearch.addEventListener("input", renderFileList);
    for (const [id, open] of [
      ["admin-expand-all", true],
      ["admin-collapse-all", false],
    ])
      $(id).addEventListener("click", () => {
        els.fileList.querySelectorAll("details").forEach((folder) => {
          folder.open = open;
          state.layout.folders[folder.dataset.folder] = open;
        });
        saveLayout();
      });
    let draggedFolder = null;
    els.fileList.addEventListener("dragstart", (event) => {
      const root = event.target.closest("[data-folder]");
      if (!root) return;
      draggedFolder = root.dataset.folder;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedFolder);
    });
    els.fileList.addEventListener("dragover", (event) => {
      if (draggedFolder && event.target.closest("[data-folder]")) {
        event.preventDefault();
        event.target.closest("[data-folder]").classList.add("is-drop-target");
      }
    });
    els.fileList.addEventListener("dragleave", (event) =>
      event.target.closest("[data-folder]")?.classList.remove("is-drop-target")
    );
    const reorder = (source, target) => {
      const parent = (key) => (key.includes("/") ? key.slice(0, key.lastIndexOf("/")) : "");
      if (parent(source) !== parent(target)) return;
      const roots = [...els.fileList.querySelectorAll("[data-folder]")]
        .map((node) => node.dataset.folder)
        .filter((key) => parent(key) === parent(source));
      const from = roots.indexOf(source),
        to = roots.indexOf(target);
      if (from < 0 || to < 0 || from === to) return;
      roots.splice(from, 1);
      roots.splice(to, 0, source);
      state.layout.order = [...state.layout.order.filter((key) => !roots.includes(key)), ...roots];
      saveLayout();
      renderFileList();
    };
    els.fileList.addEventListener("drop", (event) => {
      event.preventDefault();
      const target = event.target.closest("[data-folder]");
      if (target && draggedFolder) reorder(draggedFolder, target.dataset.folder);
      draggedFolder = null;
    });
    els.fileList.addEventListener("dragend", () => {
      draggedFolder = null;
      els.fileList
        .querySelectorAll(".is-drop-target")
        .forEach((node) => node.classList.remove("is-drop-target"));
    });
    els.fileList.addEventListener("keydown", (event) => {
      if (!event.altKey || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
      const root = event.target.closest("[data-folder]");
      if (!root || event.target.tagName !== "SUMMARY") return;
      event.preventDefault();
      const parentKey = (key) => (key.includes("/") ? key.slice(0, key.lastIndexOf("/")) : "");
      const roots = [...els.fileList.querySelectorAll("[data-folder]")].filter(
        (node) => parentKey(node.dataset.folder) === parentKey(root.dataset.folder)
      );
      const target = roots[roots.indexOf(root) + (event.key === "ArrowDown" ? 1 : -1)];
      if (target) {
        const key = root.dataset.folder;
        reorder(key, target.dataset.folder);
        [...els.fileList.querySelectorAll("[data-folder]")]
          .find((node) => node.dataset.folder === key)
          ?.querySelector("summary")
          .focus();
      }
    });
    els.newButton.addEventListener("click", () => openCreate());
    els.newFolderButton.addEventListener("click", () => openCreate(null, null, "folder"));
    els.newCancel.addEventListener("click", closeCreate);
    els.newCreate.addEventListener("click", () =>
      createDraft().catch((error) => showStatus(error.message, "error"))
    );
    els.newPath.addEventListener("input", () => {
      state.pathWasEdited = true;
      updateCreateTarget();
    });
    els.newTitle.addEventListener("input", () => {
      if (!state.pathWasEdited) els.newPath.value = slugify(els.newTitle.value);
      updateCreateTarget();
    });
    els.newTemplate.addEventListener("change", updateCreateTarget);
    els.newDirectory.addEventListener("change", updateCreateTarget);
    els.source.addEventListener("input", markDirty);
    ["select", "keyup", "mouseup"].forEach((event) =>
      els.source.addEventListener(event, updateSelectionActions)
    );
    els.publish.addEventListener("click", publish);
    $("admin-keep-draft").addEventListener("click", () => {
      if (!state.current) return;
      state.current.conflict = false;
      writeDraft(state.current.path, els.source.value, state.current.sha);
      els.conflictNotice.hidden = true;
      els.publish.disabled = state.readOnly || !state.current.dirty;
      showStatus("Your draft is kept. Publishing will replace the current repository version.");
    });
    els.createLinked.addEventListener("click", () => {
      const selection = selectedText();
      if (selection) openCreate(selection);
    });
    els.linkExisting.addEventListener("click", () => {
      const selection = selectedText();
      if (!selection) return;
      state.linkSelection = selection;
      writeDraft(selection.path, els.source.value, state.current.sha);
      els.linkNotice.hidden = false;
      setMobilePanel("files");
      showStatus("Choose a destination note from the file list.");
    });
    els.linkCancel.addEventListener("click", () => {
      state.linkSelection = null;
      els.linkNotice.hidden = true;
    });
    els.logout.addEventListener("click", async () => {
      await api("/logout", { method: "POST" });
      location.assign("/admin/");
    });
    els.mobileTabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-admin-tab]");
      if (button) setMobilePanel(button.dataset.adminTab);
    });
    document.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (state.current) {
          writeDraft(state.current.path, els.source.value, state.current.sha);
          showStatus("Draft saved in this browser.", "success");
        }
      }
    });
  }

  window.addEventListener("DOMContentLoaded", initialize);
})();
