// Site-wide interactive behaviour.
// Loaded on every page via <script defer src="/assets/js/site.js"> in base.njk.
// The theme-init IIFE stays inline in <head> to prevent FOUC; everything else lives here.

(function () {
  "use strict";

  // ---------- theme ----------
  const MOON_D =
    "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z";
  const SUN_D =
    "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z";

  function updateThemeButton(theme) {
    const button = document.getElementById("theme-toggle");
    if (!button) return;
    const path = button.querySelector("svg path");
    if (!path) return;
    path.setAttribute("d", theme === "dark" ? SUN_D : MOON_D);
    button.setAttribute(
      "title",
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
    );
  }

  function toggleTheme() {
    const html = document.documentElement;
    const wasDark = html.classList.contains("dark");
    html.classList.toggle("dark");
    const nextTheme = wasDark ? "light" : "dark";
    // localStorage can throw in private Safari / storage-disabled contexts;
    // swallow so the visual toggle still works per-session.
    try {
      localStorage.setItem("theme", nextTheme);
    } catch (e) {}
    updateThemeButton(nextTheme);
  }

  // ---------- mobile menu ----------
  function openMobileMenu() {
    const menu = document.getElementById("mobile-menu");
    const backdrop = document.getElementById("menu-backdrop");
    if (!menu) return;
    menu.classList.remove("translate-x-full");
    if (backdrop) backdrop.classList.remove("opacity-0", "pointer-events-none");
    document.body.classList.add("overflow-hidden");
  }

  function closeMobileMenu() {
    const menu = document.getElementById("mobile-menu");
    const backdrop = document.getElementById("menu-backdrop");
    if (menu) menu.classList.add("translate-x-full");
    if (backdrop) backdrop.classList.add("opacity-0", "pointer-events-none");
    document.body.classList.remove("overflow-hidden");
  }

  function toggleMobileMenu() {
    const menu = document.getElementById("mobile-menu");
    if (!menu) return;
    const isOpen = !menu.classList.contains("translate-x-full");
    if (isOpen) closeMobileMenu();
    else openMobileMenu();
  }

  // ---------- delegated click handler ----------
  // Wires [data-action] buttons and links. Extend via new case arms only.
  document.addEventListener("click", function (event) {
    const actionEl = event.target.closest("[data-action]");
    if (actionEl) {
      switch (actionEl.dataset.action) {
        case "toggle-theme":
          toggleTheme();
          return;
        case "toggle-mobile-menu":
          toggleMobileMenu();
          return;
        case "close-mobile-menu":
          closeMobileMenu();
          return;
      }
    }

    // Close menu when clicking the backdrop itself.
    if (event.target.id === "menu-backdrop") closeMobileMenu();
  });

  // Escape closes the mobile menu.
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    const menu = document.getElementById("mobile-menu");
    if (menu && !menu.classList.contains("translate-x-full")) closeMobileMenu();
  });

  // ---------- boot ----------
  // This file is loaded with        , so the DOM is already parsed on execution.
  // Sync the theme-toggle icon with the theme applied by the inline head script.
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem("theme");
  } catch (e) {}
  const prefersDark =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  updateThemeButton(savedTheme || (prefersDark ? "dark" : "light"));
})();
