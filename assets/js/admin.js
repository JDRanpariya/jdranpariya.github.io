(function () {
  "use strict";

  const API = "/api/admin";
  const DRAFT_KEY = "site-admin-drafts-v1";
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
      return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function writeDraft(path, content, sha) {
    const stored = drafts();
    stored[path] = { content, sha: sha || null, updatedAt: new Date().toISOString() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(stored));
  }

  function removeDraft(path) {
    const stored = drafts();
    delete stored[path];
    localStorage.setItem(DRAFT_KEY, JSON.stringify(stored));
  }

  function showStatus(message, kind = "") {
    clearTimeout(state.statusTimer);
    els.status.textContent = message;
    els.status.dataset.kind = kind;
    els.status.classList.add("is-visible");
    state.statusTimer = setTimeout(() => els.status.classList.remove("is-visible"), 4200);
  }

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    if (options.method && options.method !== "GET") headers["X-CSRF-Token"] = state.csrf;
    const response = await fetch(`${API}${path}`, { ...options, headers, credentials: "same-origin" });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
      showLogin();
      throw new Error("Your admin session ended. Sign in again.");
    }
    if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
    return payload;
  }

  function publicUrl(path) {
    if (path === "apps/research/content/research-home.md") {
      return "https://research.jdranpariya.com/";
    }
    const rules = [
      [/^src\/odysseys\/(.+?)(?:\/index)?\.md$/, "/odysseys/$1/"],
      [/^src\/writings\/(.+)\.md$/, "/writings/$1/"],
      [/^src\/library\/(books|papers|lectures)\/(.+)\.md$/, "/library/$1/$2/"],
      [/^src\/projects\/(.+?)(?:\/index)?\.md$/, "/projects/$1/"],
      [/^src\/notes\/(.+)\.md$/, "/notes/$1/"],
    ];
    for (const [pattern, replacement] of rules) {
      if (pattern.test(path)) return path.replace(pattern, replacement);
    }
    return "";
  }

  function fileLabel(path) {
    return path.split("/").pop().replace(/\.md$/, "").replaceAll("-", " ");
  }

  function fileGroup(path) {
    if (path.startsWith("apps/research/content/")) return "research";
    const parts = path.split("/");
    if (parts[1] === "odysseys" && parts[2] && !parts[2].endsWith(".md")) return `odysseys / ${parts[2]}`;
    if (parts[1] === "library" && parts[2]) return `library / ${parts[2]}`;
    return parts[1] || "other";
  }

  function parseDocument(markdown) {
    const match = String(markdown).match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
    const frontmatter = {};
    if (match) {
      match[1].split("\n").forEach((line) => {
        const separator = line.indexOf(":");
        if (separator < 0) return;
        const key = line.slice(0, separator).trim();
        let value = line.slice(separator + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        frontmatter[key] = value;
      });
    }
    return { frontmatter, body: match ? markdown.slice(match[0].length) : markdown };
  }

  function renderPreview() {
    if (!state.current) {
      els.preview.innerHTML = '<p class="admin-preview-empty">The rendered note will appear here.</p>';
      return;
    }
    const { frontmatter, body } = parseDocument(els.source.value);
    const renderer = window.markdownit({ html: false, linkify: true, typographer: true });
    const title = frontmatter.fullTitle || frontmatter.title || fileLabel(state.current.path);
    els.preview.innerHTML = `<h1>${escapeHtml(title)}</h1>${renderer.render(body)}`;
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
    els.draftState.textContent = state.current.dirty ? "Draft saved in this browser" : "Published version";
    els.publish.disabled = !state.current.dirty;
    clearTimeout(state.draftTimer);
    state.draftTimer = setTimeout(() => {
      writeDraft(state.current.path, state.current.content, state.current.sha);
      renderFileList();
    }, 350);
    renderPreview();
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
    const hasSelection = Boolean(selectedText());
    els.createLinked.disabled = !hasSelection;
    els.linkExisting.disabled = !hasSelection;
  }

  function renderFileList() {
    const query = els.fileSearch.value.trim().toLowerCase();
    const storedDrafts = drafts();
    const filtered = state.files.filter((file) => !query || file.path.toLowerCase().includes(query));
    let group = "";
    els.fileList.innerHTML = filtered
      .map((file) => {
        const nextGroup = fileGroup(file.path);
        const heading = nextGroup === group ? "" : `<div class="admin-file-group">${escapeHtml(nextGroup)}</div>`;
        group = nextGroup;
        const active = state.current?.path === file.path ? ' aria-current="page"' : "";
        const draft = storedDrafts[file.path] ? ' data-draft="true"' : "";
        return `${heading}<button class="admin-file-button" type="button" data-file-path="${escapeHtml(file.path)}"${active}${draft}>${escapeHtml(fileLabel(file.path))}</button>`;
      })
      .join("");
    if (!filtered.length) els.fileList.innerHTML = '<p class="admin-file-empty">No matching files.</p>';
  }

  async function openFile(path) {
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
    const draft = drafts()[path];
    const useDraft = draft && (!draft.sha || draft.sha === remote.sha);
    const content = useDraft ? draft.content : remote.content;
    state.current = {
      path,
      sha: remote.sha || null,
      content,
      remoteContent: remote.content,
      dirty: content !== remote.content || !remote.sha,
    };
    els.source.disabled = false;
    els.source.value = content;
    els.filePath.textContent = path;
    els.draftState.textContent = state.current.dirty ? "Draft saved in this browser" : "Published version";
    els.publish.disabled = !state.current.dirty;
    updateSelectionActions();
    renderPreview();
    renderFileList();
    setMobilePanel("edit");
  }

  function replaceSelection(selection, replacement) {
    const draft = drafts()[selection.path];
    const sourceContent = state.current?.path === selection.path ? els.source.value : draft?.content;
    if (typeof sourceContent !== "string") throw new Error("The source draft is no longer available.");
    const updated = `${sourceContent.slice(0, selection.start)}${replacement}${sourceContent.slice(selection.end)}`;
    const sourceFile = state.files.find((file) => file.path === selection.path);
    writeDraft(selection.path, updated, sourceFile?.sha || null);
    if (state.current?.path === selection.path) {
      els.source.value = updated;
      state.current.content = updated;
      state.current.dirty = true;
      els.publish.disabled = false;
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
    const url = publicUrl(targetPath);
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

  function defaultPath(template, title) {
    const slug = slugify(title) || "untitled";
    if (template === "writing") return `src/writings/${slug}.md`;
    if (template === "codex") {
      const currentDirectory = state.current?.path.startsWith("src/odysseys/")
        ? state.current.path.slice(0, state.current.path.lastIndexOf("/"))
        : "src/odysseys/the-codex-of-understanding";
      return `${currentDirectory}/${slug}.md`;
    }
    return `src/notes/${slug}.md`;
  }

  function noteTemplate(template, title, selection) {
    const today = new Date().toISOString().slice(0, 10);
    if (template === "writing") {
      return `---\ntitle: ${JSON.stringify(title)}\npublished: ${today}\nlastUpdated: ${today}\ntags: []\nstatus: "draft"\nsection: "writings"\nlayout: layouts/post.njk\ndescription: ""\n---\n\n`;
    }
    if (template === "codex") {
      const source = selection ? publicUrl(selection.path) : "";
      const quotation = selection ? `> From [source](${source})\n>\n> ${selection.text.replaceAll("\n", "\n> ")}\n\n` : "";
      return `---\ntitle: ${JSON.stringify(title)}\nlayout: layouts/post.njk\nsection: "odyssey"\ntags: ["learning"]\npublished: ${today}\nlastUpdated: ${today}\n---\n\n${quotation}`;
    }
    return `# ${title}\n\n`;
  }

  function openCreate(selection = null) {
    state.createSelection = selection;
    state.pathWasEdited = false;
    els.create.hidden = false;
    els.newTemplate.value = selection ? "codex" : "codex";
    els.newTitle.value = selection?.text.trim().replace(/\s+/g, " ").slice(0, 80) || "";
    els.newPath.value = defaultPath(els.newTemplate.value, els.newTitle.value);
    els.newTitle.focus();
    els.newTitle.select();
    setMobilePanel("files");
  }

  function closeCreate() {
    els.create.hidden = true;
    state.createSelection = null;
  }

  async function createDraft() {
    const title = els.newTitle.value.trim();
    const path = els.newPath.value.trim();
    if (!title || !/^src\/[a-zA-Z0-9][a-zA-Z0-9_./-]*\.md$/.test(path) || path.includes("..")) {
      showStatus("Enter a title and a valid src/…/*.md path.", "error");
      return;
    }
    if (state.files.some((file) => file.path === path)) {
      showStatus("A file already exists at that path.", "error");
      return;
    }
    const selection = state.createSelection;
    const content = noteTemplate(els.newTemplate.value, title, selection);
    if (selection) {
      const url = publicUrl(path);
      replaceSelection(selection, `[${selection.text}](${url})`);
    }
    state.files.push({ path, sha: null, size: content.length, localOnly: true });
    state.files.sort((a, b) => a.path.localeCompare(b.path));
    writeDraft(path, content, null);
    closeCreate();
    await openFile(path);
    showStatus("New draft created. Publish it when ready.", "success");
  }

  async function publish() {
    if (!state.current || !state.current.dirty) return;
    els.publish.disabled = true;
    els.publish.textContent = "Publishing…";
    try {
      const result = await api("/file", {
        method: "PUT",
        body: JSON.stringify({
          path: state.current.path,
          content: els.source.value,
          sha: state.current.sha,
          message: `${state.current.sha ? "update" : "add"} ${fileLabel(state.current.path)}`,
        }),
      });
      state.current.sha = result.sha;
      state.current.remoteContent = els.source.value;
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
        ? "Published. Reload the research site to see this version."
        : result.commitUrl
          ? "Published. The site deployment has started."
          : "Published to GitHub.";
      showStatus(message, "success");
    } catch (error) {
      showStatus(error.message, "error");
      els.publish.disabled = false;
    } finally {
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
      loading: $("admin-loading"), login: $("admin-login"), loginError: $("admin-login-error"),
      loginForm: $("admin-login-form"), password: $("admin-password"), loginButton: $("admin-login-button"),
      workspace: $("admin-workspace"), account: $("admin-account"), identity: $("admin-identity"),
      logout: $("admin-logout"), fileSearch: $("admin-file-search"), fileList: $("admin-file-list"),
      create: $("admin-create"), newButton: $("admin-new"), newTitle: $("admin-new-title"),
      newPath: $("admin-new-path"), newTemplate: $("admin-new-template"), newCancel: $("admin-new-cancel"),
      newCreate: $("admin-new-create"), source: $("admin-source"), filePath: $("admin-file-path"),
      draftState: $("admin-draft-state"), publish: $("admin-publish"), preview: $("admin-preview-content"),
      publicLink: $("admin-public-link"), createLinked: $("admin-create-linked"), linkExisting: $("admin-link-existing"),
      linkNotice: $("admin-link-notice"), linkCancel: $("admin-link-cancel"), mobileTabs: $("admin-mobile-tabs"),
      status: $("admin-status"),
    });
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
        els.loginButton.textContent = "Open workspace";
      }
    });

    try {
      const session = await api("/session");
      if (!session.authenticated) {
        showLogin();
        return;
      }
      state.csrf = session.csrf;
      els.identity.textContent = `@${session.login}`;
      const filesResult = await api("/files");
      state.files = filesResult.files;
      const stored = drafts();
      Object.entries(stored).forEach(([path, draft]) => {
        if (!state.files.some((file) => file.path === path)) {
          state.files.push({ path, sha: draft.sha || null, size: draft.content?.length || 0, localOnly: !draft.sha });
        }
      });
      state.files.sort((a, b) => a.path.localeCompare(b.path));
      renderFileList();
      els.loading.hidden = true;
      els.login.hidden = true;
      els.workspace.hidden = false;
      els.account.hidden = false;
      els.mobileTabs.hidden = false;
    } catch (error) {
      if (!els.login.hidden) return;
      els.loading.textContent = error.message;
      showStatus(error.message, "error");
    }

    els.fileList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-file-path]");
      if (button) openFile(button.dataset.filePath).catch((error) => showStatus(error.message, "error"));
    });
    els.fileSearch.addEventListener("input", renderFileList);
    els.newButton.addEventListener("click", () => openCreate());
    els.newCancel.addEventListener("click", closeCreate);
    els.newCreate.addEventListener("click", () => createDraft().catch((error) => showStatus(error.message, "error")));
    els.newPath.addEventListener("input", () => { state.pathWasEdited = true; });
    els.newTitle.addEventListener("input", () => {
      if (!state.pathWasEdited) els.newPath.value = defaultPath(els.newTemplate.value, els.newTitle.value);
    });
    els.newTemplate.addEventListener("change", () => {
      state.pathWasEdited = false;
      els.newPath.value = defaultPath(els.newTemplate.value, els.newTitle.value);
    });
    els.source.addEventListener("input", markDirty);
    ["select", "keyup", "mouseup"].forEach((event) => els.source.addEventListener(event, updateSelectionActions));
    els.publish.addEventListener("click", publish);
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
    els.preview.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (link && link.getAttribute("href")?.startsWith("/")) event.preventDefault();
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
