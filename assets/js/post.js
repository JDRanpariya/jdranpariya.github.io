// Article-layout interactive behaviour.
// Loaded via <script defer src="/assets/js/post.js"> in post.njk only.
//
// Responsibilities
// ----------------
// 1. Collapsible Table of Contents (desktop sidebar).
// 2. Footnote sidebar: on desktop, hoist the default markdown-it-footnote
//    section out of the flow and position each note next to its reference.
//    On mobile, leave the default bottom-of-page behaviour untouched.
//
// Known fragility
// ---------------
// The footnote positioner is imperative DOM + inline styles. Inline styles
// are intentional: PurgeCSS strips unused Tailwind classes in prod, so any
// positioning we express as classes would have to be safelisted. When
// browser support for CSS anchor positioning stabilises in all targets,
// the whole renderFootnotes() function can be deleted in favour of a pure
// CSS solution. Until then, edit with care and retest hover/click + resize.

(function () {
  "use strict";

  // ---------- TOC ----------
  function initTOC() {
    const toggle = document.querySelector(".toc-toggle");
    const content = document.querySelector(".toc-content");
    if (!toggle || !content) return;

    // Start open; sync measured height so the transition works on first click.
    content.style.maxHeight = content.scrollHeight + "px";
    content.style.opacity = "1";
    toggle.textContent = "▲";

    toggle.addEventListener("click", function () {
      const isClosed = content.style.maxHeight === "0px";
      if (isClosed) {
        content.style.maxHeight = content.scrollHeight + "px";
        content.style.opacity = "1";
        toggle.textContent = "▲";
      } else {
        content.style.maxHeight = "0px";
        content.style.opacity = "0";
        toggle.textContent = "▼";
      }
    });
  }

  // ---------- footnote sidebar ----------
  function initFootnotes() {
    const sidebar = document.getElementById("footnotes-sidebar");
    const section = document.querySelector("section.footnotes");
    const sep = document.querySelector("hr.footnotes-sep");
    if (!section) return;

    // Only forward refs (.footnote-ref > a); backrefs live inside the section,
    // not in <sup>, so they don't count here.
    const refs = Array.from(document.querySelectorAll(".footnote-ref > a"));
    // Only <li>. The old code used 'li, p' which doubled the count.
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

    // footnote-number → its current sidebar DOM element.
    const elMap = new Map();
    const GAP = 16; // min px between adjacent notes

    function render() {
      const isDesktop = window.innerWidth >= 768 && sidebar;

      if (!isDesktop) {
        // Mobile: restore the default footnotes at the bottom.
        section.style.display = "";
        if (sep) sep.style.display = "";
        if (sidebar) sidebar.innerHTML = "";
        elMap.clear();
        return;
      }

      // Desktop: hide inline footnotes, populate sidebar.
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

        // Inline styles are load-bearing: PurgeCSS strips unused classes.
        const el = document.createElement("div");
        el.style.cssText =
          "position:absolute;width:100%;top:" +
          top +
          "px;transition:color .2s,font-weight .2s";
        el.style.color = "var(--color-text-light)";
        el.style.fontSize = "0.875rem";
        el.style.lineHeight = "1.625";

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

    // Hover / click interactions. Registered once; closures use elMap.
    notes.forEach(function (fn) {
      fn.ref.addEventListener("mouseenter", function () {
        const el = elMap.get(fn.n);
        if (el) el.style.color = "var(--color-text)";
      });
      fn.ref.addEventListener("mouseleave", function () {
        const el = elMap.get(fn.n);
        if (el) el.style.color = "";
      });
      fn.ref.addEventListener("click", function (e) {
        if (window.innerWidth < 768) return; // mobile: default jump behavior
        e.preventDefault();
        const el = elMap.get(fn.n);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.style.color = "var(--color-text)";
        el.style.fontWeight = "600";
        setTimeout(function () {
          el.style.color = "";
          el.style.fontWeight = "";
        }, 2000);
      });
    });

    render();
    window.__fnRender = render;

    // Re-layout after fonts/images finish loading (positions may shift).
    window.addEventListener("load", render);

    // Re-layout on resize (desktop ↔ mobile switch, text reflow).
    let timer;
    window.addEventListener("resize", function () {
      clearTimeout(timer);
      timer = setTimeout(render, 250);
    });
  }

  initTOC();
  initFootnotes();
})();
