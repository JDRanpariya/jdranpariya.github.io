import { initPostFootnotes } from "./post-footnotes.js";

// Article-layout interactive behaviour.
// Loaded as a module by post.njk only.
//
// Responsibilities
// ----------------
// 1. TOC toggle (desktop sidebar)
// 2. Footnote sidebar (desktop): hoist footnotes into the right gutter,
//    aligned with their references. Always visible — no click needed.
// 3. Mobile footnote expansion: tap a footnote ref to reveal the note
//    inline below the paragraph, instead of jumping to page bottom.
// 4. Article engagement: record qualified reading signals in Umami.

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
        // aria-hidden alone doesn't remove the links from tab order — the
        // panel only visually collapses via opacity/max-height. `inert`
        // does that removal without killing the collapse transition (which
        // `hidden`/display:none would).
        panel.inert = open;
      });
    });
  }

  // ---------- qualified article engagement ----------
  function initArticleAnalytics() {
    if (document.body.dataset.section !== "writings") return;

    const articleBody = document.querySelector(".prose-site");
    if (!articleBody) return;

    const article = window.location.pathname;
    let visibleSeconds = 0;
    let maxDepth = 0;
    let engagedTracked = false;
    let deepReadTracked = false;

    function track(name, data) {
      if (!window.umami || typeof window.umami.track !== "function") return;
      try {
        window.umami.track(name, data);
      } catch (e) {}
    }

    function updateDepth() {
      const rect = articleBody.getBoundingClientRect();
      const articleTop = rect.top + window.scrollY;
      const viewportBottom = window.scrollY + window.innerHeight;
      const depth = Math.round(((viewportBottom - articleTop) / articleBody.offsetHeight) * 100);
      maxDepth = Math.max(maxDepth, Math.min(100, Math.max(0, depth)));
    }

    function maybeTrack() {
      if (!engagedTracked && visibleSeconds >= 30) {
        engagedTracked = true;
        track("article-engaged", {
          article: article,
          seconds: visibleSeconds,
          depth: maxDepth,
        });
      }

      if (!deepReadTracked && visibleSeconds >= 60 && maxDepth >= 90) {
        deepReadTracked = true;
        track("article-deep-read", {
          article: article,
          seconds: visibleSeconds,
          depth: maxDepth,
        });
      }
    }

    updateDepth();
    window.addEventListener("scroll", updateDepth, { passive: true });
    window.addEventListener("resize", updateDepth);

    const timer = window.setInterval(function () {
      if (document.visibilityState === "visible") visibleSeconds++;
      maybeTrack();

      if (engagedTracked && deepReadTracked) {
        window.clearInterval(timer);
      }
    }, 1000);

    window.addEventListener(
      "pagehide",
      function () {
        window.clearInterval(timer);
      },
      { once: true }
    );
  }

  initTOC();
  initPostFootnotes(document, window);
  initArticleAnalytics();
})();
