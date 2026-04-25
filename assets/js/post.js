// Article-layout interactive behaviour.
// Loaded via <script defer src="/assets/js/post.js"> in post.njk only.
//
// Responsibilities
// ----------------
// 1. TOC toggle (desktop sidebar). aria-expanded on the button drives
//    aria-hidden on the panel; CSS does the rest.
// 2. Footnote sidebar: on desktop, hoist the default markdown-it-footnote
//    section out of the flow and position each note next to its reference.
//    On mobile, leave the default bottom-of-page behaviour untouched.
//
// Known fragility
// ---------------
// The footnote positioner is imperative DOM + inline styles. Inline styles
// are intentional: PurgeCSS strips unused Tailwind classes in prod. When CSS
// anchor positioning lands in baseline browsers, renderFootnotes() can be
// deleted in favour of a pure-CSS solution.

(function () {
  "use strict";

  // ---------- TOC ----------
  function initTOC() {
    const toggles = document.querySelectorAll(".toc-toggle");
    toggles.forEach(function (toggle) {
      // <details><summary> handles its own toggling natively; only wire up
      // free-standing <button> toggles (the desktop sidebar).
      if (toggle.tagName !== "BUTTON") return;
      const panelId = toggle.getAttribute("aria-controls");
      const panel = panelId && document.getElementById(panelId);
      if (!panel) return;

      toggle.addEventListener("click", function () {
        const open = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!open));
        panel.setAttribute("aria-hidden", String(open));
      });
    });
  }

  // ---------- footnote sidebar ----------
  function initFootnotes() {
    const sidebar = document.getElementById("footnotes-sidebar");
    const section = document.querySelector("section.footnotes");
    const sep = document.querySelector("hr.footnotes-sep");
    if (!section) return;

    // Only forward refs (.footnote-ref > a); backrefs live inside the section.
    const refs = Array.from(document.querySelectorAll(".footnote-ref > a"));
    const items = Array.from(section.querySelectorAll("li"));
    if (!refs.length || !items.length) return;

    // Build footnote data once (clone content, strip backrefs).
    const notes = [];
    refs.forEach(function (ref, i) {
      if (!items[i]) return;
      const clone = items[i].cloneNode(true);
      clone.querySelectorAll(".footnote-backref").forEach(function (el) {
        el.remove();
      });
      notes.push({ ref: ref, html: clone.innerHTML.trim(), n: i + 1 });
    });

    const elMap = new Map();
    const GAP = 16;
    const DESKTOP_MQ = window.matchMedia("(min-width: 1024px)");

    function render() {
      const isDesktop = DESKTOP_MQ.matches && sidebar;

      if (!isDesktop) {
        section.style.display = "";
        if (sep) sep.style.display = "";
        if (sidebar) sidebar.innerHTML = "";
        elMap.clear();
        return;
      }

      section.style.display = "none";
      if (sep) sep.style.display = "none";
      sidebar.innerHTML = "";
      elMap.clear();

      const origin = sidebar.getBoundingClientRect().top + window.scrollY;
      let floor = 0;

      notes.forEach(function (fn) {
        const refY = fn.ref.getBoundingClientRect().top + window.scrollY;
        const desired = refY - origin;
        const top = Math.max(desired, floor);

        const el = document.createElement("div");
        el.style.cssText =
          "position:absolute;width:100%;top:" +
          top +
          "px;transition:color .2s,font-weight .2s";
        el.style.color = "var(--color-ink-muted)";
        el.style.fontSize = "0.8125rem";
        el.style.lineHeight = "1.5";

        const row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:flex-start;gap:0.5rem";

        const num = document.createElement("span");
        num.style.cssText =
          "flex-shrink:0;color:var(--color-accent);font-weight:600";
        num.textContent = fn.n + ".";

        const body = document.createElement("div");
        body.style.flex = "1";
        body.innerHTML = fn.html;
        body.querySelectorAll("p").forEach(function (p) {
          p.style.margin = "0";
        });

        row.appendChild(num);
        row.appendChild(body);
        el.appendChild(row);
        sidebar.appendChild(el);
        elMap.set(fn.n, el);

        floor = top + el.offsetHeight + GAP;
      });
    }

    notes.forEach(function (fn) {
      fn.ref.addEventListener("mouseenter", function () {
        const el = elMap.get(fn.n);
        if (el) el.style.color = "var(--color-ink)";
      });
      fn.ref.addEventListener("mouseleave", function () {
        const el = elMap.get(fn.n);
        if (el) el.style.color = "";
      });
      fn.ref.addEventListener("click", function (e) {
        if (!DESKTOP_MQ.matches) return;
        e.preventDefault();
        const el = elMap.get(fn.n);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.style.color = "var(--color-ink)";
        el.style.fontWeight = "600";
        setTimeout(function () {
          el.style.color = "";
          el.style.fontWeight = "";
        }, 2000);
      });
    });

    render();
    window.__fnRender = render;

    window.addEventListener("load", render);

    let timer;
    window.addEventListener("resize", function () {
      clearTimeout(timer);
      timer = setTimeout(render, 250);
    });
  }

  initTOC();
  initFootnotes();
})();
