// /now page behaviour: archived-update switcher.
// Loaded via <script defer src="/assets/js/now.js"> from now.njk.
//
// The page renders every update into the DOM at build time. Clicking an
// archive link swaps which one is visible, without a navigation. The URL
// hash (#update-YYYY-MM-DD) is honoured on first load and on hashchange.
//
// Focus management
// ----------------
// Screen-reader / keyboard users need to know content changed when they
// activate an archive link — we move focus to the update heading in that
// case. We do NOT move focus on initial render or on hashchange-from-
// deep-link, because that's a page navigation and the browser already
// anchors to the hash target.

(function () {
  "use strict";

  function showUpdate(dateStringId, opts) {
    const heading = document.getElementById("update-heading");
    const container = document.getElementById("updates-container");
    if (!heading || !container) return;

    const allUpdates = container.querySelectorAll(".now-update-content");
    const target = document.getElementById("update-" + dateStringId);
    const archiveLinks = document.querySelectorAll(
      ".archive-list .archive-link"
    );

    if (!target) {
      console.error("Now: no update element for date", dateStringId);
      return;
    }

    allUpdates.forEach(function (el) {
      el.classList.add("hidden");
    });
    target.classList.remove("hidden");

    const formattedDate = target.dataset.formattedDate || dateStringId;
    heading.textContent = "Update from " + formattedDate;

    archiveLinks.forEach(function (link) {
      const isActive = link.dataset.date === dateStringId;
      link.classList.toggle("font-bold", isActive);
      link.classList.toggle("text-accent", isActive);
      link.classList.toggle("text-ink-muted", !isActive);
    });

    // Only move focus when the user explicitly activated this change (e.g.
    // clicked an archive link). Don't steal focus on initial render or
    // hash-change routing — those shouldn't draw a focus ring around the
    // heading.
    if (opts && opts.moveFocus) {
      if (heading.tabIndex < 0) heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }

  // Delegated click handler for every archive link. Replaces inline onclick=.
  document.addEventListener("click", function (event) {
    const link = event.target.closest(".archive-link[data-date]");
    if (!link) return;
    event.preventDefault();
    showUpdate(link.dataset.date, { moveFocus: true });
  });

  // Figure out which update is visible at render time.
  const initialUpdate = document.querySelector(
    ".now-update-content:not(.hidden)"
  );
  const initialDateStringId = initialUpdate ? initialUpdate.dataset.date : null;

  if (!initialDateStringId) {
    const heading = document.getElementById("update-heading");
    if (heading) heading.textContent = "Latest Update";
    const footerNote = document.getElementById("footer-update-note");
    if (footerNote) footerNote.textContent = "No updates yet.";
  }

  function handleHashChange() {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#update-")) {
      const dateFromHash = hash.substring("#update-".length);
      if (document.getElementById("update-" + dateFromHash)) {
        showUpdate(dateFromHash, { moveFocus: false });
        return;
      }
    }
    if (initialDateStringId) showUpdate(initialDateStringId, { moveFocus: false });
  }

  window.addEventListener("hashchange", handleHashChange);
  handleHashChange();
})();
