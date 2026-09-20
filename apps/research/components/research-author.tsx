"use client";

import { parseResearchHome } from "@/lib/research-home";
import { useCallback, useEffect, useState } from "react";

const MODE_KEY = "research-author-mode";
const DRAFT_KEY = "research-home-markdown-draft";
const DATABASE = "research-authoring";
const STORE = "handles";
const HANDLE_KEY = "personal-site-root";
const SOURCE_PATH = ["apps", "research", "content", "research-home.md"];

type DirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission(options?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission(options?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
};

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<DirectoryHandle>;
  }
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getRememberedHandle() {
  try {
    const database = await openDatabase();
    return await new Promise<DirectoryHandle | null>((resolve, reject) => {
      const request = database.transaction(STORE, "readonly").objectStore(STORE).get(HANDLE_KEY);
      request.onsuccess = () => resolve((request.result as DirectoryHandle | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

async function rememberHandle(handle: DirectoryHandle) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(handle, HANDLE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function researchFile(handle: DirectoryHandle) {
  if ((await handle.queryPermission({ mode: "readwrite" })) !== "granted") {
    const permission = await handle.requestPermission({ mode: "readwrite" });
    if (permission !== "granted") throw new Error("Folder permission was not granted.");
  }
  let directory: FileSystemDirectoryHandle = handle;
  for (const name of SOURCE_PATH.slice(0, -1)) {
    directory = await directory.getDirectoryHandle(name);
  }
  return directory.getFileHandle(SOURCE_PATH.at(-1)!);
}

export function ResearchAuthor({
  initialMarkdown,
  onPreview,
}: {
  initialMarkdown: string;
  onPreview: (markdown: string) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [handle, setHandle] = useState<DirectoryHandle | null>(null);
  const [status, setStatus] = useState(
    "Browser draft · connect the source folder to write the file"
  );
  const [statusKind, setStatusKind] = useState<"" | "success" | "error">("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const requested = new URL(window.location.href).searchParams.get("edit") === "1";
      const persisted = localStorage.getItem(MODE_KEY) === "1";
      const draft = localStorage.getItem(DRAFT_KEY);
      setEnabled(requested || persisted);
      if (draft) {
        setMarkdown(draft);
        try {
          parseResearchHome(draft);
          onPreview(draft);
        } catch {
          // Keep the published document visible until the draft is valid again.
        }
      }
    });
    void getRememberedHandle().then(setHandle);
    return () => cancelAnimationFrame(frame);
  }, [onPreview]);

  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if (!event.altKey || event.key.toLowerCase() !== "e") return;
      event.preventDefault();
      setEnabled((current) => {
        const next = !current;
        localStorage.setItem(MODE_KEY, next ? "1" : "0");
        return next;
      });
    };
    window.addEventListener("keydown", toggle);
    return () => window.removeEventListener("keydown", toggle);
  }, []);

  const connect = useCallback(async () => {
    if (!window.showDirectoryPicker) {
      setStatus("This browser cannot write to a local folder. Browser drafts still work.");
      setStatusKind("error");
      return;
    }
    try {
      const nextHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      const file = await researchFile(nextHandle);
      const source = await (await file.getFile()).text();
      parseResearchHome(source);
      await rememberHandle(nextHandle);
      setHandle(nextHandle);
      setMarkdown(source);
      onPreview(source);
      setStatus(`Connected to ${nextHandle.name}/apps/research/content/research-home.md`);
      setStatusKind("success");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus(
        `Choose the personal-site repository folder. ${error instanceof Error ? error.message : ""}`
      );
      setStatusKind("error");
    }
  }, [onPreview]);

  async function save() {
    try {
      parseResearchHome(markdown);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The Markdown is invalid.");
      setStatusKind("error");
      return;
    }

    localStorage.setItem(DRAFT_KEY, markdown);
    onPreview(markdown);
    if (!handle) {
      setStatus("Saved as a browser draft.");
      setStatusKind("success");
      return;
    }

    try {
      const file = await researchFile(handle);
      const writer = await file.createWritable();
      await writer.write(markdown);
      await writer.close();
      setStatus("Saved to apps/research/content/research-home.md");
      setStatusKind("success");
    } catch (error) {
      setStatus(`Saved as a browser draft. ${error instanceof Error ? error.message : ""}`);
      setStatusKind("error");
    }
  }

  function closeMode() {
    setEnabled(false);
    setOpen(false);
    localStorage.setItem(MODE_KEY, "0");
    const url = new URL(window.location.href);
    url.searchParams.delete("edit");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }

  if (!enabled) return null;

  return (
    <aside className="research-author" aria-label="Research authoring">
      <div className="research-author-toolbar">
        <span>Authoring</span>
        <button onClick={() => setOpen(true)} type="button">
          Edit page
        </button>
        <button onClick={() => void connect()} type="button">
          Connect source
        </button>
        <button aria-label="Exit authoring mode" onClick={closeMode} type="button">
          ×
        </button>
      </div>

      {open ? (
        <section className="research-author-editor" aria-label="Edit research Markdown">
          <header>
            <div>
              <p>Markdown source</p>
              <h2>Research</h2>
            </div>
            <button aria-label="Close editor" onClick={() => setOpen(false)} type="button">
              ×
            </button>
          </header>
          <textarea
            aria-label="Research Markdown"
            onChange={(event) => setMarkdown(event.target.value)}
            spellCheck="true"
            value={markdown}
          />
          <footer>
            <p data-kind={statusKind}>{status}</p>
            <span>
              <button onClick={() => onPreview(markdown)} type="button">
                Preview
              </button>
              <button className="is-primary" onClick={() => void save()} type="button">
                Save
              </button>
            </span>
          </footer>
        </section>
      ) : null}
    </aside>
  );
}
