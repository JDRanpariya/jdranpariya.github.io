// Shared article notes. The public post and sandboxed admin preview use the
// same controller. Preview code calls this from the parent; draft scripts
// remain disabled inside its iframe.
export function initPostFootnotes(document, window) {
  const cleanup = [];
  let disposed = false;
  const section = document.querySelector("section.footnotes");
  const sep = document.querySelector("hr.footnotes-sep");
  const wasHidden = section?.classList.contains("sr-only");
  const separatorDisplay = sep?.style.display;
  function listen(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    cleanup.push(() => target.removeEventListener(event, handler, options));
  }
  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  // ---------- footnote sidebar (desktop) ----------
  function initFootnotes() {
    const sidebar = document.getElementById("footnotes-sidebar");
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
      // The sidebar is aria-hidden (its content is the sr-only bottom list's
      // duplicate, kept for sighted mouse users) — links inside an
      // aria-hidden container must not be sequentially focusable. tabindex=-1
      // pulls them out of Tab order while leaving mouse clicks working.
      clone.querySelectorAll("a").forEach(function (a) {
        a.setAttribute("tabindex", "-1");
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

      // Desktop: visually hide bottom footnotes (sidebar is the visible
      // rendering) but keep them in the accessibility tree — sr-only,
      // not display:none — so in-text refs still land somewhere for
      // keyboard/SR users instead of jumping at a non-rendered target.
      section.classList.add("sr-only");
      if (sep) sep.style.display = "none";
      sidebar.innerHTML = "";
      sidebar.setAttribute("aria-hidden", "true");
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
          "font-size:0.9375rem;" +
          "line-height:1.55;";

        const row = document.createElement("div");
        row.style.cssText =
          "display:flex;align-items:flex-start;gap:0.5rem;";

        const num = document.createElement("span");
        num.style.cssText =
          "flex-shrink:0;color:var(--color-accent);" +
          "font-weight:600;font-size:0.875rem;padding-top:0.15em;";
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
    listen(window, "load", renderSidebar);
    listen(document, "load", renderSidebar, true);
    if (document.fonts) {
      listen(document.fonts, "loadingdone", renderSidebar);
      document.fonts.ready.then(() => { if (!disposed) renderSidebar(); });
    }
    if (window.ResizeObserver) {
      const observer = new window.ResizeObserver(renderSidebar);
      const prose = document.querySelector(".prose-site");
      if (prose) observer.observe(prose);
      cleanup.push(() => observer.disconnect());
    }

    let timer;
    listen(window, "resize", function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(renderSidebar, 250);
    });
    cleanup.push(() => window.clearTimeout(timer));
    cleanup.push(() => { if (sidebar) sidebar.innerHTML = ""; });
  }

  // ---------- mobile inline footnote expansion ----------
  function initMobileFootnotes() {
    const MOBILE_MQ = window.matchMedia("(max-width: 1023px)");
    const sep = document.querySelector("hr.footnotes-sep");
    if (!section) return;

    // Visually hide bottom footnote list — inline expansion replaces it —
    // but keep it sr-only rather than display:none so it's still reachable
    // for assistive tech that doesn't trigger the tap-to-expand handler.
    section.classList.add("sr-only");
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
      listen(ref, "click", function (e) {
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
          "font-size:0.9375rem;" +
          "line-height:1.55;" +
          "color:var(--color-ink-secondary);";

        // Number badge
        const badge = document.createElement("span");
        badge.style.cssText =
          "display:inline-block;" +
          "font-weight:600;color:var(--color-accent);" +
          "font-size:0.875rem;margin-right:0.5rem;";
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
        inline.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: "nearest",
        });


      });
    });
    function closeInline() {
      if (activeInline) activeInline.remove();
      activeInline = null;
    }
    listen(document, "click", function (event) {
      if (
        activeInline &&
        !activeInline.contains(event.target) &&
        !event.target.closest(".footnote-ref")
      ) closeInline();
    });
    listen(MOBILE_MQ, "change", () => {
      if (!MOBILE_MQ.matches) closeInline();
    });
    cleanup.push(closeInline);
  }


  initFootnotes();
  initMobileFootnotes();
  return () => {
    disposed = true;
    cleanup.splice(0).reverse().forEach((dispose) => dispose());
    if (section && !wasHidden) section.classList.remove("sr-only");
    if (sep) sep.style.display = separatorDisplay;
  };
}
