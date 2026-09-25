// Spatial note trails for the Codex of Understanding. This follows the same
// interaction contract as Scholium: native horizontal panning, readable fixed
// width panes, measured 40px ancestor rails, explicit focus, and non-mutating
// previews before navigation is committed.

(function () {
  "use strict";

  const CODEX_ROOT = "/odysseys/the-codex-of-understanding/";
  const STACK_PARAM = "stackedNotes";
  const FOCUS_PARAM = "noteFocus";
  const PANE_EDGE = 40;

  if (!window.location.pathname.startsWith(CODEX_ROOT)) return;

  const section = document.querySelector("#main > section");
  const sourceArticle = section && section.querySelector("article");
  if (!section || !sourceArticle) return;
  const originalSectionChildren = [...section.childNodes];

  const noteCache = new Map();
  const scrollPositions = new Map();
  const baseUrl = new URL(window.location.href);
  baseUrl.searchParams.delete(STACK_PARAM);
  baseUrl.searchParams.delete(FOCUS_PARAM);
  const originalTitle = document.title;
  let entries = [];
  let focusIndex = 0;
  let previewSequence = 0;
  let previewDismissPoint = null;
  let previewDismissTarget = null;
  let nativeScrollY = window.scrollY;

  function canonicalUrl(value) {
    return new URL(value, window.location.origin);
  }

  function isCodexUrl(url) {
    return url.origin === window.location.origin && url.pathname.startsWith(CODEX_ROOT);
  }

  function plainPrimaryClick(event) {
    return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  }

  function compactLabel(value, limit = 58) {
    const clean = value.replace(/\s+/g, " ").trim();
    if (clean.length <= limit) return clean;
    const clipped = clean.slice(0, limit + 1).replace(/\s+\S*$/, "");
    return `${clipped || clean.slice(0, limit).trim()}…`;
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
    const scroller = document.createElement("div");
    scroller.className = "codex-pane-scroll";
    scroller.append(hero.cloneNode(true), prose.cloneNode(true));
    pane.append(scroller);
    return {
      title: heading.textContent.trim(),
      excerpt: prose.textContent.replace(/\s+/g, " ").trim(),
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
    const response = await fetch(`${url.pathname}${url.search}`, { headers: { Accept: "text/html" } });
    if (!response.ok) throw new Error(`Could not load ${url.pathname}`);
    const documentNode = new DOMParser().parseFromString(await response.text(), "text/html");
    const note = extractNote(documentNode, url);
    noteCache.set(url.pathname, note);
    return note;
  }

  function trailUrl() {
    const url = new URL(baseUrl.href);
    entries.slice(1).forEach((entry) => url.searchParams.append(STACK_PARAM, entry.url.pathname));
    if (entries.length > 1 && focusIndex !== entries.length - 1) {
      url.searchParams.set(FOCUS_PARAM, String(focusIndex));
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function setHistory(mode) {
    window.history[mode === "replace" ? "replaceState" : "pushState"](
      {
        codexTrail: entries.slice(1).map((entry) => entry.url.pathname),
        codexFocus: focusIndex,
      },
      "",
      trailUrl()
    );
  }

  function hidePreview() {
    previewSequence += 1;
    document.querySelector(".codex-note-preview")?.remove();
  }

  function previewTargetRect(element, point) {
    const rect = element.getBoundingClientRect();
    if (!point) return rect;
    return [...element.getClientRects()].find(
      (line) => point.x >= line.left && point.x <= line.right && point.y >= line.top && point.y <= line.bottom
    ) || rect;
  }

  function previewPosition(rect, placement, width, height) {
    const margin = 12;
    const gap = 13;
    const minTop = 58;
    const maxLeft = Math.max(margin, window.innerWidth - width - margin);
    const maxTop = Math.max(minTop, window.innerHeight - height - margin);
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clampLeft = (value) => Math.min(maxLeft, Math.max(margin, value));
    const clampTop = (value) => Math.min(maxTop, Math.max(minTop, value));

    if (placement === "path") {
      const left = clampLeft(centerX - 42);
      const below = rect.bottom + gap;
      if (below + height <= window.innerHeight - margin) {
        return { left, top: below, side: "below", arrow: Math.min(width - 22, Math.max(22, centerX - left)) };
      }
      const top = Math.max(minTop, rect.top - gap - height);
      return { left, top, side: "above", arrow: Math.min(width - 22, Math.max(22, centerX - left)) };
    }

    const top = clampTop(rect.top - 18);
    const right = rect.right + gap;
    if (right + width <= window.innerWidth - margin) {
      return { left: right, top, side: "right", arrow: Math.min(height - 22, Math.max(22, centerY - top)) };
    }
    const left = rect.left - gap - width;
    if (left >= margin) {
      return { left, top, side: "left", arrow: Math.min(height - 22, Math.max(22, centerY - top)) };
    }

    const fallbackLeft = clampLeft(centerX - 42);
    const below = rect.bottom + gap;
    const side = below + height <= window.innerHeight - margin ? "below" : "above";
    return {
      left: fallbackLeft,
      top: side === "below" ? below : Math.max(minTop, rect.top - gap - height),
      side,
      arrow: Math.min(width - 22, Math.max(22, centerX - fallbackLeft)),
    };
  }

  function showPreview(entry, index, element, placement, point) {
    if (previewDismissPoint || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const sequence = ++previewSequence;
    const preview = document.createElement("aside");
    preview.className = "codex-note-preview";
    preview.setAttribute("role", "tooltip");
    preview.innerHTML = `
      <p class="codex-preview-index">${index === undefined ? "Preview" : String(index + 1).padStart(2, "0")}</p>
      <h2>${entry.title.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</h2>
      <p class="codex-preview-excerpt">${compactLabel(entry.excerpt, 460).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>`;
    document.body.append(preview);
    requestAnimationFrame(() => {
      if (sequence !== previewSequence || !document.contains(element)) return preview.remove();
      const target = previewTargetRect(element, point);
      const position = previewPosition(target, placement, preview.offsetWidth, preview.offsetHeight);
      preview.dataset.side = position.side;
      preview.style.setProperty("--preview-left", `${position.left}px`);
      preview.style.setProperty("--preview-top", `${position.top}px`);
      preview.style.setProperty("--preview-arrow-offset", `${position.arrow}px`);
      preview.classList.add("is-positioned");
    });
  }

  function paneFocusScrollLeft(index, stack, pane) {
    return Math.min(
      Math.max(0, stack.scrollWidth - stack.clientWidth),
      Math.max(0, index) * Math.max(0, pane.offsetWidth - PANE_EDGE)
    );
  }

  function scrollPaneToIndex(index, behavior = "smooth") {
    const stack = section.querySelector(".codex-note-stack");
    const pane = stack?.querySelector(`[data-trail-index="${index}"]`);
    if (!stack || !pane) return;
    stack.scrollTo({ left: paneFocusScrollLeft(index, stack, pane), behavior });
  }

  function measureObscuredPanes() {
    const panes = [...section.querySelectorAll(".codex-note-pane")];
    panes.forEach((pane, index) => {
      const next = panes[index + 1];
      const isObscured = Boolean(next && next.getBoundingClientRect().left < pane.getBoundingClientRect().right - 1);
      pane.classList.toggle("is-obscured", isObscured);
      const spine = pane.querySelector(".codex-pane-spine");
      if (spine) {
        spine.setAttribute("aria-hidden", String(!isObscured));
        spine.tabIndex = isObscured ? 0 : -1;
      }
    });
  }

  function activeChanged() {
    const active = entries[focusIndex];
    if (!active) return;
    document.title = `${active.title} | JD Ranpariya`;
    window.dispatchEvent(new CustomEvent("codex:active-note", { detail: { url: active.url.pathname, title: active.title } }));
  }

  function createPath() {
    const path = document.createElement("nav");
    path.className = "codex-note-path";
    path.setAttribute("aria-label", "Open Codex notes");
    entries.forEach((entry, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.codexFocus = String(index);
      button.title = entry.title;
      if (index === focusIndex) button.setAttribute("aria-current", "page");
      const number = document.createElement("span");
      number.textContent = String(index + 1).padStart(2, "0");
      button.append(number, compactLabel(entry.title));
      path.append(button);
    });
    return path;
  }

  function render({ focusHeading = false, behavior = "smooth" } = {}) {
    hidePreview();
    const wasStacked = section.classList.contains("codex-stack-section");
    section.querySelectorAll(".codex-note-pane").forEach((pane) => {
      const scroll = pane.querySelector(".codex-pane-scroll");
      scrollPositions.set(pane.dataset.noteUrl, scroll?.scrollTop || 0);
    });

    if (entries.length === 1) {
      section.classList.remove("codex-stack-section", "codex-has-path");
      document.body.classList.remove("codex-note-mode");
      section.replaceChildren(...originalSectionChildren);
      document.title = originalTitle;
      if (wasStacked) requestAnimationFrame(() => window.scrollTo(0, nativeScrollY));
      return;
    }

    if (!wasStacked) nativeScrollY = window.scrollY;
    document.body.classList.add("codex-note-mode");
    section.classList.add("codex-stack-section", "codex-has-path");
    const stack = document.createElement("div");
    stack.className = "codex-note-stack has-path";
    stack.setAttribute("aria-label", "Open Codex notes");

    entries.forEach((entry, index) => {
      const pane = entry.pane.cloneNode(true);
      pane.dataset.trailIndex = String(index);
      pane.style.setProperty("--pane-index", String(index));
      pane.classList.toggle("is-active", index === focusIndex);
      pane.setAttribute("aria-current", index === focusIndex ? "page" : "false");

      const spine = document.createElement("button");
      spine.type = "button";
      spine.className = "codex-pane-spine";
      spine.dataset.codexFocus = String(index);
      spine.dataset.previewIndex = String(index);
      spine.setAttribute("aria-label", `Focus pane ${String(index + 1).padStart(2, "0")}: ${entry.title}`);
      spine.setAttribute("aria-hidden", "true");
      spine.tabIndex = -1;
      const number = document.createElement("span");
      number.textContent = String(index + 1).padStart(2, "0");
      const title = document.createElement("strong");
      title.textContent = compactLabel(entry.title);
      spine.append(number, title);
      pane.prepend(spine);

      const nextEntry = entries[index + 1];
      pane.querySelectorAll("a[href]").forEach((link) => {
        if (!isCodexUrl(canonicalUrl(link.href))) return;
        link.classList.add("codex-internal-link");
        if (nextEntry && canonicalUrl(link.href).pathname === nextEntry.url.pathname) {
          link.classList.add("is-open-note");
        }
      });
      stack.append(pane);
    });

    section.replaceChildren(createPath(), stack);
    activeChanged();
    if (!wasStacked) window.scrollTo(0, 0);

    requestAnimationFrame(() => {
      stack.querySelectorAll(".codex-note-pane").forEach((pane) => {
        const scroll = pane.querySelector(".codex-pane-scroll");
        if (scroll) scroll.scrollTop = scrollPositions.get(pane.dataset.noteUrl) || 0;
      });
      scrollPaneToIndex(focusIndex, behavior);
      measureObscuredPanes();
      if (focusHeading) {
        const heading = stack.querySelector(`[data-trail-index="${focusIndex}"] h1`);
        if (heading) {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
        }
      }
    });
  }

  function focusPane(index, historyMode = "push") {
    const bounded = Math.max(0, Math.min(index, entries.length - 1));
    focusIndex = bounded;
    section.querySelectorAll(".codex-note-pane").forEach((pane, paneIndex) => {
      pane.classList.toggle("is-active", paneIndex === bounded);
      pane.setAttribute("aria-current", paneIndex === bounded ? "page" : "false");
    });
    section.querySelectorAll(".codex-note-path button").forEach((button, buttonIndex) => {
      if (buttonIndex === bounded) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    activeChanged();
    scrollPaneToIndex(bounded);
    setHistory(historyMode);
  }

  async function openNote(value, sourceIndex) {
    const targetUrl = canonicalUrl(value);
    const existingIndex = entries.findIndex((entry) => entry.url.pathname === targetUrl.pathname);
    if (existingIndex >= 0) {
      focusPane(existingIndex);
      return;
    }

    try {
      const note = await loadNote(targetUrl);
      entries = [...entries.slice(0, sourceIndex + 1), note];
      focusIndex = entries.length - 1;
      render({ focusHeading: true });
      setHistory("push");
    } catch {
      window.location.assign(targetUrl.href);
    }
  }

  async function restoreFromUrl() {
    const params = new URL(window.location.href).searchParams;
    const restored = [initialEntry];
    for (const value of params.getAll(STACK_PARAM)) {
      const url = canonicalUrl(value);
      if (!isCodexUrl(url)) continue;
      try {
        restored.push(await loadNote(url));
      } catch {
        break;
      }
    }
    entries = restored;
    const requestedFocus = Number.parseInt(params.get(FOCUS_PARAM) || String(entries.length - 1), 10);
    focusIndex = Number.isFinite(requestedFocus)
      ? Math.max(0, Math.min(requestedFocus, entries.length - 1))
      : entries.length - 1;
    render({ behavior: "auto" });
  }

  entries = [initialEntry];
  void restoreFromUrl();

  const previewTargetSelector = ".codex-note-pane a[href], article .prose-site a[href], .codex-pane-spine, .codex-note-path button";

  function previewLink(target, point) {
    const url = canonicalUrl(target.href);
    if (!isCodexUrl(url)) return;
    const sequence = previewSequence;
    void loadNote(url).then((entry) => {
      if (sequence !== previewSequence || previewDismissPoint || !target.isConnected) return;
      if (!target.matches(":hover") && document.activeElement !== target) return;
      showPreview(entry, undefined, target, "inline", point);
    }).catch(() => {});
  }

  function previewTarget(target, point) {
    if (target.matches("a[href]")) {
      previewLink(target, point);
      return;
    }
    const index = Number(target.dataset.codexFocus);
    const entry = entries[index];
    if (entry) showPreview(entry, index, target, target.closest(".codex-note-path") ? "path" : "spine", point);
  }

  section.addEventListener("pointerdown", function (event) {
    const target = event.target.closest(previewTargetSelector);
    if (!target) return;
    previewDismissPoint = { x: event.clientX, y: event.clientY };
    previewDismissTarget = target;
    hidePreview();
  });

  section.addEventListener("pointermove", function (event) {
    if (!previewDismissPoint) return;
    if (Math.hypot(event.clientX - previewDismissPoint.x, event.clientY - previewDismissPoint.y) <= 12) return;
    if (previewDismissTarget?.isConnected && previewDismissTarget.contains(event.target)) return;
    previewDismissPoint = null;
    previewDismissTarget = null;
    const target = event.target.closest(previewTargetSelector);
    if (target) previewTarget(target, { x: event.clientX, y: event.clientY });
  }, { passive: true });

  section.addEventListener("pointerleave", function () {
    previewDismissPoint = null;
    previewDismissTarget = null;
    hidePreview();
  });

  section.addEventListener("click", function (event) {
    const focusTarget = event.target.closest("[data-codex-focus]");
    if (focusTarget && plainPrimaryClick(event)) {
      event.preventDefault();
      hidePreview();
      focusPane(Number(focusTarget.dataset.codexFocus));
      return;
    }

    const link = event.target.closest(".codex-note-pane a[href], article .prose-site a[href]");
    if (!link || !plainPrimaryClick(event)) return;
    const url = canonicalUrl(link.href);
    if (!isCodexUrl(url)) return;
    const sourcePane = link.closest(".codex-note-pane");
    const sourceIndex = sourcePane ? Number(sourcePane.dataset.trailIndex) : 0;
    if (url.pathname === entries[sourceIndex].url.pathname && url.hash) return;
    event.preventDefault();
    hidePreview();
    void openNote(url, sourceIndex);
  });

  section.addEventListener("pointerover", function (event) {
    const target = event.target.closest(previewTargetSelector);
    if (!target || previewDismissPoint || (event.relatedTarget && target.contains(event.relatedTarget))) return;
    previewTarget(target, { x: event.clientX, y: event.clientY });
  });

  section.addEventListener("pointerout", function (event) {
    const target = event.target.closest(previewTargetSelector);
    if (!target || (event.relatedTarget && target.contains(event.relatedTarget))) return;
    if (target === previewDismissTarget) {
      previewDismissPoint = null;
      previewDismissTarget = null;
    }
    hidePreview();
  });

  section.addEventListener("focusin", function (event) {
    const target = event.target.closest(previewTargetSelector);
    if (!target) return;
    previewTarget(target);
  });

  section.addEventListener("focusout", hidePreview);
  section.addEventListener("scroll", measureObscuredPanes, true);
  section.addEventListener("wheel", (event) => {
    if (!event.shiftKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    const stack = event.target.closest(".codex-note-stack");
    if (!stack) return;
    event.preventDefault();
    stack.scrollLeft += event.deltaY;
  }, { passive: false });
  window.addEventListener("resize", measureObscuredPanes);
  window.addEventListener("keydown", (event) => event.key === "Escape" && hidePreview());
  window.addEventListener("popstate", () => void restoreFromUrl());
  window.addEventListener("pageshow", (event) => event.persisted && void restoreFromUrl());
  window.addEventListener("pagehide", () => { document.title = originalTitle; });
})();
