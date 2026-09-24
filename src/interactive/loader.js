/**
 * Interactive Loader — tiny runtime that hydrates interactive blocks.
 *
 * Loaded ONLY on pages with hasInteractive:true in frontmatter.
 * Finds all elements with [data-interactive], lazy-loads the appropriate
 * module via dynamic import when the element scrolls into view
 * (IntersectionObserver with 200px rootMargin for pre-fetching).
 *
 * Each module exports a mount(el, config, theme) function.
 *
 * Size budget: this file should stay under 2 KB.
 */

import { getTheme } from "./theme.js";

const registry = {
  plotly: () => import("./modules/plotly.js"),
  threejs: () => import("./modules/threejs.js"),
  "model-viewer": () => import("./modules/model-viewer.js"),
  mermaid: () => import("./modules/mermaid.js"),
  matter: () => import("./modules/matter.js"),
  cannon: () => import("./modules/cannon.js"),
  custom: (el) => import(el.dataset.src),
  ncase: () => import("./modules/ncase.js"),
  scrollama: () => import("./modules/scrollama.js"),
  d3: () => import("./modules/d3.js"),
};

function parseConfig(el) {
  try {
    return JSON.parse(el.dataset.config || "{}");
  } catch {
    return {};
  }
}

async function hydrate(el) {
  const type = el.dataset.interactive;
  const loader = registry[type];
  if (!loader) {
    console.warn(`[interactive] Unknown type: ${type}`);
    return;
  }

  const canvas = el.querySelector(".interactive__canvas");
  if (canvas) canvas.setAttribute("aria-busy", "true");

  try {
    const module = await loader(el);
    const config = parseConfig(el);
    const theme = getTheme();
    await module.mount(el, config, theme);
    if (canvas) {
      canvas.removeAttribute("aria-busy");
      canvas.classList.add("interactive--loaded");
    }
  } catch (e) {
    console.error(`[interactive] Failed to mount ${type}:`, e);
    if (canvas) {
      canvas.removeAttribute("aria-busy");
      canvas.classList.add("interactive--error");
    }
  }
}

// Observe all interactive elements
const elements = document.querySelectorAll("[data-interactive]");

if (elements.length > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          observer.unobserve(entry.target);
          hydrate(entry.target);
        }
      }
    },
    { rootMargin: "200px" }
  );

  elements.forEach((el) => observer.observe(el));
}
