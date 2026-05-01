// /guestbook composer behaviour.
//
// Loaded via <script defer src="/assets/js/guestbook.js">.
//
// Theme list is INJECTED BY THE SERVER as window.NOTECARD_THEMES, built
// from src/_data/notecardThemes.js which scans assets/images/notecards/
// at build time. Drop a new notecard-foo.webp in the folder, rebuild,
// and it appears in the picker. No code change here.
//
// Every theme is image-kind: { key, kind: "image", src, label }.
//
// Composer card has a FIXED rotation (CSS). Jitter at the edit surface
// reads as instability. Posted notes scatter on the wall, not here.
//
// Motion: respects prefers-reduced-motion (CSS + the submit scroll).

(function () {
  "use strict";

  const THEMES =
    Array.isArray(window.NOTECARD_THEMES) && window.NOTECARD_THEMES.length > 0
      ? window.NOTECARD_THEMES
      : [];

  const STAMPS =
    Array.isArray(window.NOTECARD_STAMPS) && window.NOTECARD_STAMPS.length > 0
      ? window.NOTECARD_STAMPS
      : [];

  const form = document.getElementById("guestbookForm");
  if (!form || THEMES.length === 0) return;

  const card = document.getElementById("composerCard");
  const textureEl = document.getElementById("composerTexture");
  const themeField = document.getElementById("themeField");
  const stampEl = document.getElementById("composerStamp");
  const stampField = document.getElementById("stampField");
  const status = document.getElementById("composerStatus");
  const picker = form.querySelector(".composer__picker");
  const prevBtn = form.querySelector('[data-action="prev-theme"]');
  const nextBtn = form.querySelector('[data-action="next-theme"]');

  // Extract slug from stamp path: "/assets/images/stamps/stamp-peony.webp" -> "peony"
  function stampSlug(src) {
    var match = src && src.match(/stamp-([a-z0-9-]+)\.webp$/i);
    return match ? match[1] : "";
  }

  // Pick a random stamp and apply it to the composer.
  // Preloads the next stamp so switching feels instant.
  var nextStampImg = null;

  function preloadNextStamp() {
    if (!STAMPS.length) return;
    var idx = Math.floor(Math.random() * STAMPS.length);
    nextStampImg = new Image();
    nextStampImg.src = STAMPS[idx];
  }

  function randomizeStamp() {
    if (!STAMPS.length || !stampEl) return;
    // Use preloaded image if available, otherwise pick fresh
    var src;
    if (nextStampImg && nextStampImg.src) {
      src = nextStampImg.src;
    } else {
      src = STAMPS[Math.floor(Math.random() * STAMPS.length)];
    }
    stampEl.src = src;
    if (stampField) stampField.value = stampSlug(src);
    // Preload the next one for instant swap
    preloadNextStamp();
  }

  // "paper-warm" -> "Paper Warm". Used for aria-labels announcing the
  // theme about to become active after a prev/next click.
  function titleFromKey(key) {
    return String(key)
      .split(/[-_]/)
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
  }

  let current = 0;

  function applyTheme(idx) {
    const theme = THEMES[idx];
    if (!theme) return;

    card.setAttribute("data-theme", theme.key);
    themeField.value = theme.key;
    textureEl.src = theme.src;

    // Randomize stamp on every theme change
    randomizeStamp();

    // Keep the visible pill label static ("Style", by design — the theme
    // is conveyed by the card illustration). Update the prev/next
    // aria-labels so screen-reader users still hear theme changes,
    // mirroring ky.fyi's pattern.
    const themeName = theme.label || titleFromKey(theme.key);
    if (prevBtn) {
      const t = THEMES[(idx - 1 + THEMES.length) % THEMES.length];
      prevBtn.setAttribute(
        "aria-label",
        "Previous style (current: " + themeName + ")",
      );
      prevBtn.setAttribute("title", "Previous: " + (t.label || titleFromKey(t.key)));
    }
    if (nextBtn) {
      const t = THEMES[(idx + 1) % THEMES.length];
      nextBtn.setAttribute(
        "aria-label",
        "Next style (current: " + themeName + ")",
      );
      nextBtn.setAttribute("title", "Next: " + (t.label || titleFromKey(t.key)));
    }
  }

  function cycle(delta) {
    current = (current + delta + THEMES.length) % THEMES.length;
    applyTheme(current);
  }

  form.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    if (btn.dataset.action === "prev-theme") cycle(-1);
    else if (btn.dataset.action === "next-theme") cycle(+1);
  });

  // Keyboard: left/right cycle while focus is inside the composer picker.
  if (picker) {
    picker.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        cycle(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        cycle(+1);
      }
    });
  }

  // Submit: the hidden iframe eats the response. Show the status note
  // and clear the textarea so it's obvious the entry was sent. We can't
  // detect Google Forms failures cross-origin; this is best-effort UI.
  form.addEventListener("submit", function () {
    window.setTimeout(function () {
      if (status) {
        status.hidden = false;
      }
      const textarea = form.querySelector("#message");
      if (textarea) {
        textarea.value = "";
        if (typeof updateHint === "function") updateHint();
      }
    }, 200);
  });

  // Character hint — gentle "running out of ink" feel.
  // Not a counter. Just a warm nudge when they're close to the edge.
  var textarea = form.querySelector("#message");
  var MAX = parseInt(textarea.getAttribute("maxlength") || "175", 10);

  // Create hint element — positioned just below the textarea so the
  // nudge appears near where the user is typing, not at card bottom.
  const hint = document.createElement("span");
  hint.className =
    "relative z-[2] self-center mt-1 " +
    "font-serif text-[0.72rem] italic text-notecard-ink opacity-0 " +
    "transition-opacity duration-300 pointer-events-none";
  hint.setAttribute("aria-live", "polite");
  hint.setAttribute("aria-atomic", "true");
  textarea.insertAdjacentElement("afterend", hint);

  function updateHint() {
    var len = textarea.value.length;
    var remaining = MAX - len;

    if (remaining <= 0) {
      hint.textContent = "you\u2019ve filled the card";
      hint.style.opacity = "0.85";
    } else if (remaining <= 10) {
      hint.textContent = "just a few words left\u2026";
      hint.style.opacity = "0.75";
    } else if (remaining <= 25) {
      hint.textContent = "running out of space";
      hint.style.opacity = "0.6";
    } else {
      hint.textContent = "";
      hint.style.opacity = "0";
    }
  }

  textarea.addEventListener("input", updateHint);

  applyTheme(current);
})();
