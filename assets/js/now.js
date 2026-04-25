// /now page behaviour: archived-update switcher.
// Loaded via <script defer src="/assets/js/now.js"> from now.njk.
//
// The page renders every update into the DOM at build time. Clicking an
// archive link swaps which one is visible, without a navigation. The URL
// hash (#update-YYYY-MM-DD) is honoured on first load and on hashchange.

(function () {
  "use strict";

  function showUpdate(dateStringId) {
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
      link.classList.toggle("text-primary", !isActive);
    });
  }

  // Delegated handler for every archive link. Replaces inline onclick=.
  document.addEventListener("click", function (event) {
    const link = event.target.closest(".archive-link[data-date]");
    if (!link) return;
    event.preventDefault();
    showUpdate(link.dataset.date);
  });

  // Figure out which update is visible at render time.
  const initialUpdate = document.querySelector(
    ".now-update-content:not(.hidden)"
  );
  const initialDateStringId = initialUpdate ? initialUpdate.dataset.date : null;

  if (initialDateStringId) {
    showUpdate(initialDateStringId);
  } else {
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
        showUpdate(dateFromHash);
        return;
      }
    }
    if (initialDateStringId) showUpdate(initialDateStringId);
  }

  window.addEventListener("hashchange", handleHashChange);
  handleHashChange();
})();
