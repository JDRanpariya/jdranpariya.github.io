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
    button.setAttribute("aria-pressed", String(theme === "dark"));
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
    const toggle = document.getElementById("mobile-menu-toggle");
    if (!menu) return;
    menu.classList.remove("translate-x-full");
    menu.removeAttribute("inert");
    if (backdrop) backdrop.classList.remove("opacity-0", "pointer-events-none");
    document.body.classList.add("overflow-hidden");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    const closeButton = menu.querySelector('[data-action="close-mobile-menu"]');
    if (closeButton) closeButton.focus();
  }

  function closeMobileMenu() {
    const menu = document.getElementById("mobile-menu");
    const backdrop = document.getElementById("menu-backdrop");
    const toggle = document.getElementById("mobile-menu-toggle");
    if (menu) {
      menu.classList.add("translate-x-full");
      menu.setAttribute("inert", "");
    }
    if (backdrop) backdrop.classList.add("opacity-0", "pointer-events-none");
    document.body.classList.remove("overflow-hidden");
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      // Always restore focus to the toggle. For nav-link closes this fires
      // right before the browser navigates away, which is harmless.
      toggle.focus();
    }
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
          break;
      }
    }

    // Close menu when clicking the backdrop itself.
    if (event.target.id === "menu-backdrop") closeMobileMenu();

    // Track every navigational link, including internal links and links that
    // also declare a more specific Umami event in their markup.
    const link = event.target.closest("a[href]");
    if (!link || !window.umami || typeof window.umami.track !== "function") return;

    let destination;
    try {
      destination = new URL(link.href, window.location.href);
    } catch (e) {
      return;
    }

    if (
      !/^(https?:|mailto:|tel:)$/.test(destination.protocol)
    )
      return;

    try {
      const external =
        /^https?:$/.test(destination.protocol) &&
        destination.origin !== window.location.origin;
      const linkText = (link.getAttribute("aria-label") || link.textContent || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 200);

      window.umami.track("link-click", {
        destination: external ? destination.hostname : destination.pathname,
        destinationUrl: destination.href.slice(0, 500),
        external,
        source: window.location.pathname,
        linkText,
        target: link.target || "_self",
        download: link.hasAttribute("download"),
      });
    } catch (e) {}
  });

  // Escape closes the mobile menu.
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    const menu = document.getElementById("mobile-menu");
    if (menu && !menu.classList.contains("translate-x-full")) closeMobileMenu();
  });

  // ---------- anonymous session context ----------
  // Umami already derives browser, OS, coarse device type, screen, language,
  // and location. Save the extra browser-provided context once per tab so an
  // individual session can be diagnosed without assigning a persistent ID.
  async function saveSessionContext(attempt) {
    try {
      if (sessionStorage.getItem("umami-session-context") === "sent") return;
    } catch (e) {}

    if (!window.umami || typeof window.umami.identify !== "function") {
      if (attempt < 20) {
        window.setTimeout(function () {
          saveSessionContext(attempt + 1);
        }, 250);
      }
      return;
    }

    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    const context = {
      rawUserAgent: navigator.userAgent,
      platform: navigator.userAgentData?.platform || navigator.platform,
      mobile: navigator.userAgentData?.mobile,
      screen: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio,
      colorDepth: window.screen.colorDepth,
      touchPoints: navigator.maxTouchPoints,
      cpuCores: navigator.hardwareConcurrency,
      deviceMemoryGb: navigator.deviceMemory,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      languages: navigator.languages?.join(", ") || navigator.language,
      connectionType: connection?.effectiveType,
      downlinkMbps: connection?.downlink,
      rttMs: connection?.rtt,
      saveData: connection?.saveData,
    };

    if (navigator.userAgentData?.getHighEntropyValues) {
      try {
        const hints = await navigator.userAgentData.getHighEntropyValues([
          "architecture",
          "bitness",
          "formFactors",
          "fullVersionList",
          "model",
          "platformVersion",
        ]);
        context.architecture = hints.architecture;
        context.bitness = hints.bitness;
        context.formFactors = hints.formFactors?.join(", ");
        context.deviceModel = hints.model;
        context.platformVersion = hints.platformVersion;
        context.browserVersions = hints.fullVersionList
          ?.map(function (brand) {
            return `${brand.brand} ${brand.version}`;
          })
          .join(", ");
      } catch (e) {}
    }

    Object.keys(context).forEach(function (key) {
      if (context[key] === undefined || context[key] === "") delete context[key];
    });

    try {
      await Promise.resolve(window.umami.identify(context));
      sessionStorage.setItem("umami-session-context", "sent");
    } catch (e) {}
  }

  // ---------- boot ----------
  // This file is loaded with defer, so the DOM is already parsed on execution.
  // Sync the theme-toggle icon with the theme applied by the inline head script.
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem("theme");
  } catch (e) {}
  const prefersDark =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  updateThemeButton(savedTheme || (prefersDark ? "dark" : "light"));
  saveSessionContext(0);
})();
