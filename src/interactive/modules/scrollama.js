/**
 * Scrollama module — scroll-driven storytelling.
 *
 * Inspired by pudding.cool. Triggers animations/state changes
 * as the reader scrolls through annotated steps.
 *
 * Config:
 *   height: number (default 600)
 *   offset: number (default 0.5) — trigger point (0-1)
 *   sticky: boolean (default true) — sticky graphic element
 *
 * Data: module in data-src that exports:
 *   setup({ container, theme, config }) returning:
 *   - onStepEnter({ index, direction, element })
 *   - onStepExit({ index, direction, element })
 *   - destroy()
 */

import { getTheme } from '../theme.js';

const CDN = 'https://cdn.jsdelivr.net/npm/scrollama@3/build/scrollama.min.js';

async function loadScrollama() {
  if (window.scrollama) return window.scrollama;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CDN;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return window.scrollama;
}

export async function mount(el, config, theme) {
  const scrollama = await loadScrollama();
  const canvas = el.querySelector('.interactive__canvas');
  const src = el.dataset.src;

  if (!src) {
    canvas.innerHTML = '<p class="text-ink-muted italic">No scroll story module specified.</p>';
    return null;
  }

  try {
    const module = await import(/* webpackIgnore: true */ src);
    const instance = await module.setup({ container: canvas, theme, config, el });

    // Initialize scrollama
    const scroller = scrollama();
    scroller
      .setup({
        step: canvas.querySelectorAll('.scroll-step'),
        offset: config.offset || 0.5,
      })
      .onStepEnter((response) => {
        if (instance.onStepEnter) instance.onStepEnter(response);
      })
      .onStepExit((response) => {
        if (instance.onStepExit) instance.onStepExit(response);
      });

    // Handle resize
    window.addEventListener('resize', scroller.resize);

    return { scroller, instance };
  } catch (e) {
    console.warn('[scrollama] Failed to load:', e);
    canvas.innerHTML = '<p class="text-ink-muted italic">Failed to load scroll story.</p>';
    return null;
  }
}

export function onThemeChange(el, instance, config, newTheme) {
  if (instance?.instance?.onThemeChange) {
    instance.instance.onThemeChange(newTheme);
  }
}
