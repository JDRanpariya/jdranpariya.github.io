// Private, local-first authoring tools for the Codex. Author mode is enabled
// with ?edit=1 or Alt+E. Published visitors receive no authoring UI.

(function () {
  "use strict";

  const CODEX_ROOT = "/odysseys/the-codex-of-understanding/";
  const INDEX_URL = "/assets/data/codex-author-index.json";
  const MODE_KEY = "codex-author-mode";
  const DRAFT_KEY = "codex-author-drafts-v1";
  const DB_NAME = "codex-authoring";
  const DB_STORE = "handles";
  const REPO_HANDLE_KEY = "repository-root";

  if (!window.location.pathname.startsWith(CODEX_ROOT)) return;

  let notes = [];
  let activeUrl = window.location.pathname;
  let selectedQuote = null;
  let repositoryHandle = null;
  let authorMode = new URL(window.location.href).searchParams.get("edit") === "1";
  let interfaceRoot;
  let editor;
  let textarea;
  let editorTitle;
  let editorStatus;
  let searchInput;
  let searchResults;
  let newTitleInput;
  let selectionMenu;
  let initialization;

  function slugify(value) {
    return value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function readDrafts() {
    try {
      return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function writeDraft(note) {
    const drafts = readDrafts();
    drafts[note.url] = { ...note, savedAt: new Date().toISOString() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  }

  function allNotes() {
    const drafts = Object.values(readDrafts());
    const merged = new Map(notes.map((note) => [note.url, note]));
    drafts.forEach((note) => merged.set(note.url, { ...merged.get(note.url), ...note }));
    return [...merged.values()].sort((a, b) => a.title.localeCompare(b.title));
  }

  function currentNote(url = activeUrl) {
    return allNotes().find((note) => note.url === url) || null;
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function storedHandle() {
    try {
      const db = await openDatabase();
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(DB_STORE, "readonly");
        const request = transaction.objectStore(DB_STORE).get(REPO_HANDLE_KEY);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      return null;
    }
  }

  async function rememberHandle(handle) {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(DB_STORE, "readwrite");
      transaction.objectStore(DB_STORE).put(handle, REPO_HANDLE_KEY);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function hasSourcePermission(write = false) {
    if (!repositoryHandle) return false;
    const options = { mode: write ? "readwrite" : "read" };
    if ((await repositoryHandle.queryPermission(options)) === "granted") return true;
    return (await repositoryHandle.requestPermission(options)) === "granted";
  }

  async function fileHandleFor(sourcePath, create = false) {
    if (!(await hasSourcePermission(create))) throw new Error("Source folder permission is required.");
    const parts = sourcePath.split("/").filter(Boolean);
    const fileName = parts.pop();
    let directory = repositoryHandle;
    for (const part of parts) directory = await directory.getDirectoryHandle(part, { create });
    return directory.getFileHandle(fileName, { create });
  }

  async function readSource(note) {
    const handle = await fileHandleFor(note.sourcePath);
    return (await handle.getFile()).text();
  }

  async function writeSource(note, markdown) {
    const handle = await fileHandleFor(note.sourcePath, true);
    const writer = await handle.createWritable();
    await writer.write(markdown);
    await writer.close();
  }

  function noteMarkdown(note) {
    return readDrafts()[note.url]?.markdown || note.markdown || "";
  }

  function setStatus(message, kind = "") {
    if (!editorStatus) return;
    editorStatus.textContent = message;
    editorStatus.dataset.kind = kind;
  }

  async function connectSource() {
    if (!("showDirectoryPicker" in window)) {
      setStatus("This browser cannot write to a local source folder. Draft saving still works.", "error");
      return;
    }
    try {
      const candidate = await window.showDirectoryPicker({ mode: "readwrite" });
      repositoryHandle = candidate;
      const rootNote = notes.find((note) => note.url === CODEX_ROOT);
      if (!rootNote) throw new Error("The Codex root note is missing from the authoring index.");
      await fileHandleFor(rootNote.sourcePath);
      await rememberHandle(repositoryHandle);
      setStatus(`Connected to ${repositoryHandle.name}.`, "success");
      await loadEditor(activeUrl, true);
    } catch (error) {
      if (error?.name !== "AbortError") {
        repositoryHandle = null;
        setStatus(`Choose the personal-site repository folder. ${error.message}`, "error");
      }
    }
  }

  async function loadEditor(url, preferSource = false) {
    activeUrl = url;
    const note = currentNote(url);
    if (!note) {
      setStatus("This note is not in the authoring index.", "error");
      return;
    }
    editorTitle.textContent = note.title;
    let markdown = noteMarkdown(note);
    if (repositoryHandle && (preferSource || !readDrafts()[note.url])) {
      try {
        markdown = await readSource(note);
      } catch (error) {
        setStatus(`Using the browser draft: ${error.message}`, "error");
      }
    }
    textarea.value = markdown;
    textarea.dataset.noteUrl = note.url;
    setStatus(repositoryHandle ? note.sourcePath : "Browser draft · connect the source folder to write files");
  }

  async function saveCurrent() {
    const note = currentNote(textarea.dataset.noteUrl);
    if (!note) return;
    const updated = { ...note, markdown: textarea.value };
    writeDraft(updated);
    if (repositoryHandle) {
      try {
        await writeSource(updated, updated.markdown);
        setStatus(`Saved to ${updated.sourcePath}.`, "success");
        return;
      } catch (error) {
        setStatus(`Saved as a browser draft. ${error.message}`, "error");
        return;
      }
    }
    setStatus("Saved as a browser draft.", "success");
  }

  function downloadCurrent() {
    const note = currentNote(textarea.dataset.noteUrl);
    if (!note) return;
    const blob = new Blob([textarea.value], { type: "text/markdown;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = note.sourcePath.split("/").pop();
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function matchQuote(markdown, quote) {
    const words = quote.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return null;
    const pattern = words
      .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("(?:\\s|[*_~`]|\\]\\([^)]*\\))+");
    const matches = [...markdown.matchAll(new RegExp(pattern, "g"))];
    return matches.length === 1 ? matches[0] : null;
  }

  async function attachNote(target) {
    if (!selectedQuote) return;
    const source = currentNote(selectedQuote.url);
    if (!source) return;
    let markdown = noteMarkdown(source);
    if (repositoryHandle) {
      try {
        markdown = await readSource(source);
      } catch (error) {
        // Continue with the indexed copy or browser draft.
      }
    }
    const match = matchQuote(markdown, selectedQuote.text);
    if (!match) {
      setStatus("That selection is not unique in the Markdown. Open the editor and link it manually.", "error");
      openEditor(source.url);
      return;
    }
    const linked = `[${match[0]}](${target.url})`;
    const updatedMarkdown = `${markdown.slice(0, match.index)}${linked}${markdown.slice(match.index + match[0].length)}`;
    const updated = { ...source, markdown: updatedMarkdown };
    writeDraft(updated);
    let sourceWriteFailed = false;
    if (repositoryHandle) {
      try {
        await writeSource(updated, updatedMarkdown);
      } catch (error) {
        sourceWriteFailed = true;
      }
    }
    hideSelectionMenu();
    openEditor(source.url);
    textarea.value = updatedMarkdown;
    setStatus(
      sourceWriteFailed
        ? `Linked the selection in a browser draft. Reconnect the source folder to write the file.`
        : `Linked the selection to ${target.title}.`,
      sourceWriteFailed ? "error" : "success"
    );
  }

  async function createNote(title) {
    if (!selectedQuote || !title.trim()) return;
    const slug = slugify(title);
    if (!slug) return;
    const url = `${CODEX_ROOT}${slug}/`;
    if (currentNote(url)) {
      renderSearch(title, "attach");
      setStatus("A note with that title already exists. Choose it from the results.", "error");
      return;
    }
    const source = currentNote(selectedQuote.url);
    const markdown = `---\ntitle: ${JSON.stringify(title.trim())}\nlayout: layouts/post\nsection: "odyssey"\ntags: ["learning"]\npublished: ${new Date().toISOString().slice(0, 10)}\n---\n\n> From [${source?.title || "Codex"}](${selectedQuote.url})\n>\n> ${selectedQuote.text.replaceAll("\n", "\n> ")}\n\n`;
    const note = {
      title: title.trim(),
      url,
      sourcePath: `src/odysseys/the-codex-of-understanding/${slug}.md`,
      markdown,
    };
    notes.push(note);
    writeDraft(note);
    if (repositoryHandle) {
      try {
        await writeSource(note, markdown);
      } catch (error) {
        // The browser draft remains available and can be downloaded.
      }
    }
    await attachNote(note);
  }

  function renderSearch(query = "", action = "open") {
    interfaceRoot.dataset.view = "search";
    editor.hidden = false;
    searchInput.value = query;
    searchInput.dataset.action = action;
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const candidates = allNotes()
      .filter((note) => note.url !== selectedQuote?.url)
      .map((note) => {
        const title = note.title.toLowerCase();
        const haystack = `${note.title} ${noteMarkdown(note)}`.toLowerCase();
        const score = terms.reduce(
          (total, term) =>
            total + (title.includes(term) ? 10 : 0) + (haystack.includes(term) ? 1 : 0),
          0
        );
        return { note, score };
      })
      .filter(({ score }) => !terms.length || score)
      .sort((a, b) => b.score - a.score || a.note.title.localeCompare(b.note.title))
      .slice(0, 30);

    searchResults.innerHTML = candidates.length
      ? candidates
          .map(
            ({ note }) =>
              `<button type="button" class="codex-author-result" data-note-url="${escapeHtml(note.url)}"><strong>${escapeHtml(note.title)}</strong><span>${escapeHtml(note.url)}</span></button>`
          )
          .join("")
      : '<p class="codex-author-empty">No matching notes.</p>';
    searchInput.focus();
  }

  function openNewNote() {
    interfaceRoot.dataset.view = "new";
    editor.hidden = false;
    newTitleInput.value = selectedQuote?.text.slice(0, 80) || "";
    newTitleInput.focus();
    newTitleInput.select();
  }

  async function openEditor(url = activeUrl) {
    interfaceRoot.dataset.view = "edit";
    editor.hidden = false;
    await loadEditor(url, false);
    textarea.setSelectionRange(0, 0);
    textarea.scrollTop = 0;
    textarea.focus();
  }

  function closeEditor() {
    if (!editor) return;
    editor.hidden = true;
    interfaceRoot.dataset.view = "";
  }

  function hideSelectionMenu() {
    if (!selectionMenu) return;
    selectionMenu.hidden = true;
  }

  function showSelectionMenu(range, pane) {
    const text = window.getSelection()?.toString().trim();
    if (!text || text.length < 2) return;
    const rect = range.getBoundingClientRect();
    selectedQuote = { text, url: pane.dataset.noteUrl || activeUrl };
    selectionMenu.style.setProperty("--selection-x", `${Math.min(window.innerWidth - 240, Math.max(12, rect.left))}px`);
    selectionMenu.style.setProperty("--selection-y", `${Math.max(12, rect.top - 48)}px`);
    selectionMenu.hidden = false;
  }

  function buildInterface() {
    interfaceRoot = document.createElement("div");
    interfaceRoot.className = "codex-author";
    interfaceRoot.innerHTML = `
      <div class="codex-author-toolbar" aria-label="Codex authoring">
        <span>Authoring</span>
        <button type="button" data-author-action="edit">Edit note</button>
        <button type="button" data-author-action="search">Search notes</button>
        <button type="button" data-author-action="connect" title="Choose the personal-site repository folder">Connect source</button>
        <button type="button" data-author-action="exit" aria-label="Exit authoring">×</button>
      </div>
      <div class="codex-selection-menu" hidden>
        <button type="button" data-author-action="new-from-selection">New note</button>
        <button type="button" data-author-action="attach-selection">Attach note</button>
        <button type="button" data-author-action="search-selection">Search</button>
      </div>
      <aside class="codex-author-editor" aria-label="Markdown editor" hidden>
        <header>
          <div>
            <p class="codex-author-kicker">Markdown</p>
            <h2 class="codex-author-title">Current note</h2>
          </div>
          <button type="button" data-author-action="close" aria-label="Close editor">×</button>
        </header>
        <div class="codex-author-edit-view">
          <textarea class="codex-author-textarea" spellcheck="true" aria-label="Markdown source"></textarea>
          <footer>
            <p class="codex-author-status" role="status"></p>
            <span>
              <button type="button" data-author-action="download">Download</button>
              <button type="button" data-author-action="save" class="is-primary">Save</button>
            </span>
          </footer>
        </div>
        <div class="codex-author-search-view">
          <label for="codex-author-search">Find a note</label>
          <input id="codex-author-search" type="search" autocomplete="off" placeholder="Title or text" />
          <div class="codex-author-results"></div>
        </div>
        <div class="codex-author-new-view">
          <label for="codex-author-new-title">New note title</label>
          <input id="codex-author-new-title" type="text" autocomplete="off" />
          <p>The selected passage will link to this note. The new note will keep the passage and a link back to its source.</p>
          <div>
            <button type="button" data-author-action="cancel-new">Cancel</button>
            <button type="button" data-author-action="create-new" class="is-primary">Create note</button>
          </div>
        </div>
      </aside>`;
    document.body.append(interfaceRoot);
    editor = interfaceRoot.querySelector(".codex-author-editor");
    textarea = interfaceRoot.querySelector(".codex-author-textarea");
    editorTitle = interfaceRoot.querySelector(".codex-author-title");
    editorStatus = interfaceRoot.querySelector(".codex-author-status");
    searchInput = interfaceRoot.querySelector("#codex-author-search");
    searchResults = interfaceRoot.querySelector(".codex-author-results");
    newTitleInput = interfaceRoot.querySelector("#codex-author-new-title");
    selectionMenu = interfaceRoot.querySelector(".codex-selection-menu");

    interfaceRoot.addEventListener("click", async (event) => {
      const action = event.target.closest("[data-author-action]")?.dataset.authorAction;
      if (action === "edit") openEditor();
      if (action === "search") renderSearch();
      if (action === "connect") await connectSource();
      if (action === "exit") setAuthorMode(false);
      if (action === "close") closeEditor();
      if (action === "save") await saveCurrent();
      if (action === "download") downloadCurrent();
      if (action === "attach-selection" || action === "search-selection") renderSearch(selectedQuote?.text || "", "attach");
      if (action === "new-from-selection") openNewNote();
      if (action === "cancel-new") closeEditor();
      if (action === "create-new") await createNote(newTitleInput.value);

      const result = event.target.closest("[data-note-url]");
      if (result) {
        const note = currentNote(result.dataset.noteUrl);
        if (searchInput.dataset.action === "attach" && selectedQuote) await attachNote(note);
        else window.location.assign(note.url);
      }
    });

    searchInput.addEventListener("input", () => renderSearch(searchInput.value, searchInput.dataset.action));
    newTitleInput.addEventListener("keydown", async (event) => {
      if (event.key === "Enter") await createNote(newTitleInput.value);
    });
  }

  function setAuthorMode(enabled) {
    authorMode = enabled;
    localStorage.setItem(MODE_KEY, enabled ? "1" : "0");
    document.body.classList.toggle("codex-author-mode", enabled);
    if (enabled && !interfaceRoot) buildInterface();
    if (interfaceRoot) interfaceRoot.hidden = !enabled;
    if (!enabled) {
      hideSelectionMenu();
      closeEditor();
    }
  }

  function initializeAuthoring() {
    if (initialization) return initialization;
    initialization = Promise.all([
      fetch(INDEX_URL).then((response) => {
        if (!response.ok) throw new Error("Could not load the note index.");
        return response.json();
      }),
      storedHandle(),
    ])
      .then(([index, handle]) => {
        notes = index;
        repositoryHandle = handle;
        const visiblePane = document.querySelector(".codex-note-pane:last-of-type");
        if (visiblePane?.dataset.noteUrl) activeUrl = visiblePane.dataset.noteUrl;
        setAuthorMode(true);
      })
      .catch((error) => {
        initialization = null;
        console.error("Codex authoring could not start", error);
      });
    return initialization;
  }

  document.addEventListener("keydown", (event) => {
    if (event.altKey && event.key.toLowerCase() === "e") {
      event.preventDefault();
      if (!interfaceRoot) initializeAuthoring();
      else setAuthorMode(!authorMode);
    }
    if (event.key === "Escape" && authorMode) {
      hideSelectionMenu();
      closeEditor();
    }
  });

  document.addEventListener("mouseup", () => {
    if (!authorMode) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return hideSelectionMenu();
    const range = selection.getRangeAt(0);
    const pane = range.commonAncestorContainer.parentElement?.closest(".codex-note-pane");
    if (pane && pane.querySelector(".prose-site")?.contains(range.commonAncestorContainer)) {
      showSelectionMenu(range, pane);
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".codex-selection-menu") && !window.getSelection()?.toString().trim()) hideSelectionMenu();
    const pane = event.target.closest(".codex-note-pane");
    if (pane?.dataset.noteUrl) activeUrl = pane.dataset.noteUrl;
  });

  window.addEventListener("codex:active-note", (event) => {
    activeUrl = event.detail.url;
    if (editor && !editor.hidden && interfaceRoot.dataset.view === "edit") loadEditor(activeUrl);
  });

  if (authorMode || localStorage.getItem(MODE_KEY) === "1") initializeAuthoring();
})();
