// Article-layout interactive behaviour.
// Loaded via <script defer src="/assets/js/post.js"> in post.njk only.
//
// Responsibilities
// ----------------
// 1. TOC toggle (desktop sidebar)
// 2. Footnote sidebar (desktop): hoist footnotes into the right gutter,
//    aligned with their references. Always visible — no click needed.
// 3. Mobile footnote expansion: tap a footnote ref to reveal the note
//    inline below the paragraph, instead of jumping to page bottom.

(function () {
  "use strict";

  // ---------- TOC ----------
  function initTOC() {
    const toggles = document.querySelectorAll(".toc-toggle");
    toggles.forEach(function (toggle) {
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

  // ---------- footnote sidebar (desktop) ----------
  function initFootnotes() {
    const sidebar = document.getElementById("footnotes-sidebar");
    const section = document.querySelector("section.footnotes");
    const sep = document.querySelector("hr.footnotes-sep");
    if (!section) return;

    const refs = Array.from(document.querySelectorAll(".footnote-ref > a"));
    const items = Array.from(section.querySelectorAll("li"));
    if (!refs.length || !items.length) return;

    // Build footnote data once.
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
    const GAP = 20;
    const DESKTOP_MQ = window.matchMedia("(min-width: 1024px)");

    function renderSidebar() {
      const isDesktop = DESKTOP_MQ.matches && sidebar;

      if (!isDesktop) {
        // Mobile: inline expander handles footnotes.
        // Just clear the desktop sidebar, don't touch bottom section.
        if (sidebar) sidebar.innerHTML = "";
        elMap.clear();
        return;
      }

      // Desktop: hide bottom footnotes, render in sidebar.
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
        el.className = "sidenote-item";
        el.style.cssText =
          "position:absolute;width:100%;top:" +
          top +
          "px;" +
          "transition:color 0.2s;" +
          "color:var(--color-ink-secondary);" +
          "font-size:0.875rem;" +
          "line-height:1.55;";

        const row = document.createElement("div");
        row.style.cssText =
          "display:flex;align-items:flex-start;gap:0.5rem;";

        const num = document.createElement("span");
        num.style.cssText =
          "flex-shrink:0;color:var(--color-accent);" +
          "font-weight:600;font-size:0.8125rem;padding-top:0.15em;";
        num.textContent = fn.n + ".";

        const body = document.createElement("div");
        body.style.flex = "1";
        body.innerHTML = fn.html;
        body.querySelectorAll("p").forEach(function (p) {
          p.style.margin = "0";
          p.style.fontSize = "inherit";
          p.style.lineHeight = "inherit";
        });

        row.appendChild(num);
        row.appendChild(body);
        el.appendChild(row);
        sidebar.appendChild(el);
        elMap.set(fn.n, el);

        floor = top + el.offsetHeight + GAP;
      });
    }

    renderSidebar();
    window.addEventListener("load", renderSidebar);

    let timer;
    window.addEventListener("resize", function () {
      clearTimeout(timer);
      timer = setTimeout(renderSidebar, 250);
    });
  }

  // ---------- mobile inline footnote expansion ----------
  function initMobileFootnotes() {
    const MOBILE_MQ = window.matchMedia("(max-width: 1023px)");
    const section = document.querySelector("section.footnotes");
    const sep = document.querySelector("hr.footnotes-sep");
    if (!section) return;

    // Hide bottom footnote list — inline expansion replaces it.
    section.style.display = "none";
    if (sep) sep.style.display = "none";

    const refs = document.querySelectorAll(".footnote-ref > a");
    const items = Array.from(section.querySelectorAll("li"));

    // Build a lookup: href → footnote HTML
    const noteHTML = {};
    refs.forEach(function (ref, i) {
      if (!items[i]) return;
      const id = ref.getAttribute("href"); // "#fn1"
      const clone = items[i].cloneNode(true);
      clone.querySelectorAll(".footnote-backref").forEach(function (el) {
        el.remove();
      });
      noteHTML[id] = clone.innerHTML.trim();
    });

    // Track currently expanded note so we can close it on second tap.
    let activeInline = null;

    refs.forEach(function (ref) {
      ref.addEventListener("click", function (e) {
        if (!MOBILE_MQ.matches) return;

        e.preventDefault();

        const id = ref.getAttribute("href");
        const html = noteHTML[id];
        if (!html) return;

        // If this note is already open, close it.
        if (activeInline && activeInline.getAttribute("data-fn") === id) {
          activeInline.remove();
          activeInline = null;
          return;
        }

        // Close any other open note.
        if (activeInline) {
          activeInline.remove();
          activeInline = null;
        }

        // Create inline expansion right after the superscript reference.
        const sup = ref.closest("sup");
        const insertAfter = sup || ref.parentElement;

        const inline = document.createElement("div");
        inline.setAttribute("data-fn", id);
        inline.className = "fn-inline";
        inline.style.cssText =
          "margin:0.75rem 0 0.75rem 1rem;" +
          "padding:0.75rem 1rem;" +
          "border-left:2px solid var(--color-accent);" +
          "background:var(--color-surface);" +
          "border-radius:0 6px 6px 0;" +
          "font-size:0.875rem;" +
          "line-height:1.55;" +
          "color:var(--color-ink-secondary);";

        // Number badge
        const badge = document.createElement("span");
        badge.style.cssText =
          "display:inline-block;" +
          "font-weight:600;color:var(--color-accent);" +
          "font-size:0.8125rem;margin-right:0.5rem;";
        badge.textContent = id.replace("#fn", "") + ".";

        inline.appendChild(badge);
        const bodySpan = document.createElement("span");
        bodySpan.innerHTML = html;
        bodySpan.querySelectorAll("p").forEach(function (p) {
          p.style.margin = "0";
          p.style.display = "inline";
        });
        inline.appendChild(bodySpan);

        insertAfter.after(inline);
        activeInline = inline;

        // Scroll the note into view smoothly.
        inline.scrollIntoView({ behavior: "smooth", block: "nearest" });

        // Close on tap outside (anywhere except another footnote ref).
        setTimeout(function () {
          document.addEventListener(
            "click",
            function dismiss(e) {
              if (
                activeInline &&
                !activeInline.contains(e.target) &&
                !e.target.closest(".footnote-ref")
              ) {
                activeInline.remove();
                activeInline = null;
                document.removeEventListener("click", dismiss);
              }
            },
            { once: false }
          );
        }, 100);
      });
    });
  }

  initTOC();
  initFootnotes();
  initMobileFootnotes();
})();
