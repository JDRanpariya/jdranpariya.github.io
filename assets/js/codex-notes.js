// Andy Matuschak-style note trails for the Codex of Understanding.
// The published HTML remains the no-JS and mobile experience. On larger
// screens, same-Codex links open beside the current note and are reflected in
// the URL so the trail survives reloads and browser history navigation.

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
    return (
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    );
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
    pane.tabIndex = -1;
    pane.append(hero.cloneNode(true), prose.cloneNode(true));

    return {
      title: heading.textContent.trim(),
      url,
      pane,
    };
  }

  const initialEntry = extractNote(document, baseUrl);
  noteCache.set(baseUrl.pathname, initialEntry);

  async function loadNote(value) {
    const url = canonicalUrl(value);
    const cached = noteCache.get(url.pathname);
    if (cached) return cached;

    const response = await fetch(`${url.pathname}${url.search}`, {
      headers: { Accept: "text/html" },
    });
    if (!response.ok) throw new Error(`Could not load ${url.pathname}`);

    const documentNode = new DOMParser().parseFromString(await response.text(), "text/html");
    const note = extractNote(documentNode, url);
    noteCache.set(url.pathname, note);
    return note;
  }

  function trailUrl() {
    const url = new URL(baseUrl.href);
    url.searchParams.delete(STACK_PARAM);
    entries.slice(1).forEach((entry) => {
      url.searchParams.append(STACK_PARAM, entry.url.pathname);
    });
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

    const stack = document.createElement("div");
    stack.className = `codex-note-stack${entries.length === 1 ? " is-single" : ""}`;
    stack.setAttribute("aria-label", "Open Codex notes");

    if (entries.length > 1) {
      const trail = document.createElement("nav");
      trail.className = "codex-note-rails";
      trail.setAttribute("aria-label", "Codex note trail");

      entries.slice(0, -1).forEach((entry, index) => {
        const rail = document.createElement("a");
        rail.className = "codex-note-rail";
        rail.href = entry.url.pathname;
        rail.dataset.trailIndex = String(index);
        rail.setAttribute("aria-label", `Open ${entry.title}`);

        const label = document.createElement("span");
        label.textContent = entry.title;
        rail.append(label);
        trail.append(rail);
      });

      stack.append(trail);
    }

    const pane = entries[entries.length - 1].pane.cloneNode(true);
    stack.append(pane);
    section.replaceChildren(stack);
    document.title = `${entries[entries.length - 1].title} | JD Ranpariya`;

    if (focusActive) pane.focus({ preventScroll: true });
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
    const width = Math.min(438, window.innerWidth - 32);
    const height = Math.min(360, window.innerHeight - 32);
    const fitsRight = rect.right + 16 + width <= window.innerWidth - 16;
    const left = fitsRight ? rect.right + 16 : Math.max(16, rect.left - width - 16);
    const top = Math.min(Math.max(16, rect.top - 32), window.innerHeight - height - 16);
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

      const viewport = document.createElement("div");
      viewport.className = "codex-note-preview__viewport";
      const canvas = document.createElement("div");
      canvas.className = "codex-note-preview__canvas";
      const pane = note.pane.cloneNode(true);
      pane.removeAttribute("tabindex");
      canvas.append(pane);
      viewport.append(canvas);
      preview.append(viewport);
      positionPreview(preview, anchor);
      document.body.append(preview);
    } catch (error) {
      // A failed preview should never prevent the underlying link from working.
    }
  }

  function schedulePreview(anchor, immediate) {
    hidePreview();
    previewTimer = window.setTimeout(() => showPreview(anchor), immediate ? 0 : 120);
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

  section.classList.add("codex-stack-section");
  entries = [initialEntry];
  render(false);
  restoreFromUrl();

  section.addEventListener("click", function (event) {
    const rail = event.target.closest("[data-trail-index]");
    if (rail && plainPrimaryClick(event)) {
      event.preventDefault();
      entries = entries.slice(0, Number(rail.dataset.trailIndex) + 1);
      render(true);
      setHistory("push");
      return;
    }

    const link = event.target.closest(".codex-note-pane a[href]");
    if (!link || !plainPrimaryClick(event)) return;
    const url = canonicalUrl(link.href);
    if (!isCodexUrl(url)) return;
    if (url.pathname === entries[entries.length - 1].url.pathname && url.hash) return;

    event.preventDefault();
    openNote(url, entries.length - 1);
  });

  section.addEventListener("pointerover", function (event) {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const link = event.target.closest(".codex-note-pane a[href]");
    if (!link || (event.relatedTarget && link.contains(event.relatedTarget))) return;
    const url = canonicalUrl(link.href);
    if (isCodexUrl(url)) schedulePreview(link, false);
  });

  section.addEventListener("pointerout", function (event) {
    const link = event.target.closest(".codex-note-pane a[href]");
    if (!link || (event.relatedTarget && link.contains(event.relatedTarget))) return;
    hidePreview();
  });

  section.addEventListener("focusin", function (event) {
    const link = event.target.closest(".codex-note-pane a[href]");
    if (link && isCodexUrl(canonicalUrl(link.href))) schedulePreview(link, true);
  });

  section.addEventListener("focusout", hidePreview);

  window.addEventListener("keydown", function (event) {
    if (event.key === "Escape") hidePreview();
  });

  window.addEventListener("popstate", restoreFromUrl);
  desktop.addEventListener("change", () => window.location.reload());

  window.addEventListener("pageshow", function (event) {
    if (event.persisted) restoreFromUrl();
  });

  window.addEventListener("pagehide", function () {
    document.title = originalTitle;
  });
})();
