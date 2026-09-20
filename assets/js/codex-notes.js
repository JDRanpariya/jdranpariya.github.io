// Spatial note trails for the Codex of Understanding. Desktop links open in
// adjacent, independently scrollable panes; mobile keeps the published page.

(function () {
  "use strict";

  const CODEX_ROOT = "/odysseys/the-codex-of-understanding/";
  const STACK_PARAM = "stackedNotes";
  const desktop = window.matchMedia("(min-width: 801px)");

  if (!desktop.matches || !window.location.pathname.startsWith(CODEX_ROOT)) return;

  const section = document.querySelector("#main > section");
  const sourceArticle = section && section.querySelector("article");
  if (!section || !sourceArticle) return;

  const noteCache = new Map();
  const baseUrl = new URL(window.location.href);
  baseUrl.searchParams.delete(STACK_PARAM);
  const originalTitle = document.title;
  let entries = [];
  let previewSequence = 0;
  let previewTimer;

  function canonicalUrl(value) {
    return new URL(value, window.location.origin);
  }

  function isCodexUrl(url) {
    return url.origin === window.location.origin && url.pathname.startsWith(CODEX_ROOT);
  }

  function plainPrimaryClick(event) {
    return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  }

  function extractNote(documentNode, url) {
    const article = documentNode.querySelector("#main article");
    const hero = article && article.querySelector(".post-hero");
    const prose = article && article.querySelector(".prose-site");
    const heading = hero && hero.querySelector("h1");
    if (!article || !hero || !prose || !heading) {
      throw new Error(`Could not find note content at ${url.pathname}`);
    }

    const pane = document.createElement("article");
    pane.className = "codex-note-pane";
    pane.dataset.noteUrl = url.pathname;
    pane.append(hero.cloneNode(true), prose.cloneNode(true));
    return { title: heading.textContent.trim(), url, pane };
  }

  const initialEntry = extractNote(document, baseUrl);
  noteCache.set(baseUrl.pathname, initialEntry);

  async function loadNote(value) {
    const url = canonicalUrl(value);
    const cached = noteCache.get(url.pathname);
    if (cached) return cached;
    const response = await fetch(`${url.pathname}${url.search}`, { headers: { Accept: "text/html" } });
    if (!response.ok) throw new Error(`Could not load ${url.pathname}`);
    const documentNode = new DOMParser().parseFromString(await response.text(), "text/html");
    const note = extractNote(documentNode, url);
    noteCache.set(url.pathname, note);
    return note;
  }

  function trailUrl() {
    const url = new URL(baseUrl.href);
    url.searchParams.delete(STACK_PARAM);
    entries.slice(1).forEach((entry) => url.searchParams.append(STACK_PARAM, entry.url.pathname));
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function setHistory(mode) {
    window.history[mode === "replace" ? "replaceState" : "pushState"](
      { codexTrail: entries.slice(1).map((entry) => entry.url.pathname) },
      "",
      trailUrl()
    );
  }

  function hidePreview() {
    window.clearTimeout(previewTimer);
    previewSequence += 1;
    document.querySelector(".codex-note-preview")?.remove();
  }

  function render(focusActive) {
    hidePreview();
    const scrollPositions = new Map(
      [...section.querySelectorAll(".codex-note-pane")].map((pane) => [pane.dataset.noteUrl, pane.scrollTop])
    );
    const stack = document.createElement("div");
    stack.className = `codex-note-stack${entries.length > 2 ? " has-overflowing-trail" : ""}`;
    stack.setAttribute("aria-label", "Open Codex notes");

    entries.forEach((entry, index) => {
      const pane = entry.pane.cloneNode(true);
      pane.dataset.trailIndex = String(index);
      pane.tabIndex = -1;

      const label = document.createElement("a");
      label.className = "codex-note-obscured-label";
      label.href = entry.url.pathname;
      label.dataset.trailIndex = String(index);
      label.textContent = entry.title;
      label.setAttribute("aria-label", `Open ${entry.title}`);
      pane.prepend(label);

      const nextEntry = entries[index + 1];
      pane.querySelectorAll("a[href]").forEach((link) => {
        if (isCodexUrl(canonicalUrl(link.href))) link.classList.add("codex-internal-link");
      });
      if (nextEntry) {
        pane.querySelectorAll("a[href]").forEach((link) => {
          if (canonicalUrl(link.href).pathname === nextEntry.url.pathname) link.classList.add("is-open-note");
        });
      }
      stack.append(pane);
    });

    section.replaceChildren(stack);
    document.title = `${entries.map((entry) => entry.title).join(" | ")} | JD Ranpariya`;

    requestAnimationFrame(() => {
      stack.querySelectorAll(".codex-note-pane").forEach((pane) => {
        pane.scrollTop = scrollPositions.get(pane.dataset.noteUrl) || 0;
      });
      stack.scrollTo({ left: Math.max(0, (entries.length - 2) * 585), behavior: "smooth" });
      if (focusActive) {
        const heading = stack.lastElementChild?.querySelector("h1");
        if (heading) {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
        }
      }
    });
  }

  async function openNote(value, sourceIndex) {
    const targetUrl = canonicalUrl(value);
    const existingIndex = entries.findIndex((entry) => entry.url.pathname === targetUrl.pathname);
    if (existingIndex >= 0) {
      entries = entries.slice(0, existingIndex + 1);
      render(true);
      setHistory("push");
      return;
    }

    try {
      const note = await loadNote(targetUrl);
      entries = [...entries.slice(0, sourceIndex + 1), note];
      render(true);
      setHistory("push");
    } catch (error) {
      window.location.assign(targetUrl.href);
    }
  }

  function positionPreview(preview, anchor) {
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(500, window.innerWidth - 32);
    const height = Math.min(400, window.innerHeight - 32);
    const fitsRight = rect.right + 14 + width <= window.innerWidth - 16;
    const left = fitsRight ? rect.right + 14 : Math.max(16, rect.left - width - 14);
    const top = Math.min(Math.max(16, rect.top - 28), window.innerHeight - height - 16);
    preview.style.setProperty("--preview-left", `${left}px`);
    preview.style.setProperty("--preview-top", `${top}px`);
  }

  async function showPreview(anchor) {
    const url = canonicalUrl(anchor.href);
    if (!isCodexUrl(url)) return;
    const sequence = ++previewSequence;
    try {
      const note = await loadNote(url);
      if (sequence !== previewSequence || !document.contains(anchor)) return;
      document.querySelector(".codex-note-preview")?.remove();
      const preview = document.createElement("aside");
      preview.className = "codex-note-preview";
      preview.setAttribute("aria-hidden", "true");
      const pane = note.pane.cloneNode(true);
      pane.removeAttribute("tabindex");
      preview.append(pane);
      positionPreview(preview, anchor);
      document.body.append(preview);
    } catch (error) {
      // Preview failure must not interfere with navigation.
    }
  }

  function schedulePreview(anchor, immediate) {
    hidePreview();
    previewTimer = window.setTimeout(() => showPreview(anchor), immediate ? 0 : 260);
  }

  async function restoreFromUrl() {
    const requested = new URL(window.location.href).searchParams.getAll(STACK_PARAM);
    const restored = [initialEntry];
    for (const value of requested) {
      const url = canonicalUrl(value);
      if (!isCodexUrl(url)) continue;
      try {
        restored.push(await loadNote(url));
      } catch (error) {
        break;
      }
    }
    entries = restored;
    render(false);
  }

  document.body.classList.add("codex-note-mode");
  section.classList.add("codex-stack-section");
  entries = [initialEntry];
  render(false);
  restoreFromUrl();

  section.addEventListener("click", function (event) {
    const trailLink = event.target.closest(".codex-note-obscured-label");
    if (trailLink && plainPrimaryClick(event)) {
      event.preventDefault();
      entries = entries.slice(0, Number(trailLink.dataset.trailIndex) + 1);
      render(true);
      setHistory("push");
      return;
    }

    const link = event.target.closest(".codex-note-pane a[href]");
    if (!link || !plainPrimaryClick(event)) return;
    const url = canonicalUrl(link.href);
    if (!isCodexUrl(url)) return;
    const sourcePane = link.closest(".codex-note-pane");
    const sourceIndex = Number(sourcePane.dataset.trailIndex);
    if (url.pathname === entries[sourceIndex].url.pathname && url.hash) return;
    event.preventDefault();
    openNote(url, sourceIndex);
  });

  section.addEventListener("pointerover", function (event) {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const link = event.target.closest(".codex-note-pane a[href]:not(.codex-note-obscured-label)");
    if (!link || (event.relatedTarget && link.contains(event.relatedTarget))) return;
    if (isCodexUrl(canonicalUrl(link.href))) schedulePreview(link, false);
  });

  section.addEventListener("pointerout", function (event) {
    const link = event.target.closest(".codex-note-pane a[href]");
    if (!link || (event.relatedTarget && link.contains(event.relatedTarget))) return;
    hidePreview();
  });

  section.addEventListener("focusin", function (event) {
    const link = event.target.closest(".codex-note-pane a[href]:not(.codex-note-obscured-label)");
    if (link && isCodexUrl(canonicalUrl(link.href))) schedulePreview(link, true);
  });

  section.addEventListener("focusout", hidePreview);
  window.addEventListener("keydown", (event) => event.key === "Escape" && hidePreview());
  window.addEventListener("popstate", restoreFromUrl);
  desktop.addEventListener("change", () => window.location.reload());
  window.addEventListener("pageshow", (event) => event.persisted && restoreFromUrl());
  window.addEventListener("pagehide", () => { document.title = originalTitle; });
})();
