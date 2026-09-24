// Site-wide interactive behaviour.
// Loaded on every page via <script defer src="/assets/js/site.js"> in base.njk.

(function () {
  "use strict";

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

  // ---------- newsletter form ----------
  function setupNewsletterForm() {
    const form = document.querySelector("[data-newsletter-form]");
    if (!form) return;

    function trackNewsletterEvent(name) {
      if (!window.umami || typeof window.umami.track !== "function") return;
      window.umami.track(name, {
        location: form.dataset.newsletterLocation || "unknown",
        page: window.location.pathname,
      });
    }

    const button = form.querySelector("[data-newsletter-submit]");
    const status = form.querySelector("[data-newsletter-status]");
    const controls = form.querySelector("[data-newsletter-controls]");
    const confirmed = form.querySelector("[data-newsletter-confirmed]");
    if (!button || !status || !controls || !confirmed) return;

    const initialLabel = button.textContent.trim();
    let submitting = false;
    let submitTimer;
    let hasRecordedView = false;

    function recordView() {
      if (hasRecordedView) return;
      hasRecordedView = true;
      trackNewsletterEvent("newsletter-form-view");
    }

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        function (entries) {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          recordView();
          observer.disconnect();
        },
        { threshold: 0.35 }
      );
      observer.observe(form);
    } else {
      recordView();
    }

    function clearSubmitTimer() {
      if (!submitTimer) return;
      window.clearTimeout(submitTimer);
      submitTimer = undefined;
    }

    function setStatus(message) {
      status.textContent = message;
      status.hidden = !message;
    }

    function cleanRedirectUrl(state) {
      if (!state) return;

      const url = new URL(window.location.href);
      let changed = false;

      // Buttondown appends the submitted address to the configured redirect.
      // It is not needed once the reader is back on the site, so remove it
      // from both the query string and the fragment without reloading.
      if (url.searchParams.has("email_address")) {
        url.searchParams.delete("email_address");
        changed = true;
      }
      if (url.hash.startsWith("#updates?") || url.hash.startsWith("#updates&")) {
        url.hash = "#updates";
        changed = true;
      }

      if (changed) {
        window.history.replaceState(
          null,
          "",
          `${url.pathname}${url.search}${url.hash}`
        );
      }
    }

    function showSubscriptionState() {
      const state = new URLSearchParams(window.location.search).get("subscription");
      cleanRedirectUrl(state);
      if (state === "pending") {
        controls.hidden = true;
        confirmed.hidden = true;
        setStatus("Check your inbox to confirm your email.");
        return true;
      }
      if (state === "confirmed") {
        controls.hidden = true;
        setStatus("");
        confirmed.hidden = false;
        const confirmationKey = `newsletter-confirmed:${window.location.pathname}`;
        if (!window.sessionStorage.getItem(confirmationKey)) {
          trackNewsletterEvent("newsletter-confirmed");
          window.sessionStorage.setItem(confirmationKey, "1");
        }
        return true;
      }
      return false;
    }

    function reset() {
      clearSubmitTimer();
      submitting = false;
      if (showSubscriptionState()) return;
      controls.hidden = false;
      confirmed.hidden = true;
      button.disabled = false;
      button.removeAttribute("aria-disabled");
      button.removeAttribute("aria-busy");
      button.textContent = initialLabel;
      setStatus("");
    }

    form.addEventListener("submit", function (event) {
      if (showSubscriptionState()) {
        event.preventDefault();
        return;
      }
      if (submitting) {
        event.preventDefault();
        return;
      }

      submitting = true;
      trackNewsletterEvent("newsletter-submit");
      button.setAttribute("aria-busy", "true");
      button.setAttribute("aria-disabled", "true");
      button.textContent = "Subscribing…";
      setStatus("");

      // Keep the native submitter enabled so the browser can complete the
      // cross-origin form submission. If navigation is blocked or stalls,
      // restore the form instead of leaving an indefinite loading state.
      submitTimer = window.setTimeout(function () {
        submitting = false;
        button.removeAttribute("aria-busy");
        button.removeAttribute("aria-disabled");
        button.textContent = initialLabel;
        setStatus("Couldn't connect. Please try again.");
      }, 12000);
    });

    reset();

    // Browsers may restore the page from their back-forward cache after the
    // Buttondown confirmation flow. Restore the URL-driven state when they do.
    window.addEventListener("pageshow", reset);
    window.addEventListener("pagehide", clearSubmitTimer);
  }

  // ---------- delegated click handler ----------
  // Wires [data-action] buttons and links. Extend via new case arms only.
  document.addEventListener("click", function (event) {
    const actionEl = event.target.closest("[data-action]");
    if (actionEl) {
      switch (actionEl.dataset.action) {
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
  setupNewsletterForm();
  saveSessionContext(0);
})();
