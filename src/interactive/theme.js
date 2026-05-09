/**
 * Interactive Theme — syncs with the site's CSS custom properties.
 * All interactive modules should pull colors from here so charts,
 * diagrams, and 3D scenes match the site's "Golden Peachy Glow" palette
 * and respond to dark mode automatically.
 *
 * Inspired by pi.ai's warm, intentional color usage in data visualizations.
 *
 * Usage:
 *   import { getTheme } from '/interactive/theme.js';
 *   const t = getTheme();
 *   // t.bg, t.ink, t.accent, t.palette, t.isDark
 */

export function getTheme() {
  const root = getComputedStyle(document.documentElement);
  const get = (prop) => root.getPropertyValue(prop).trim();
  const isDark = document.documentElement.classList.contains('dark');

  return {
    isDark,
    // Core
    bg: get('--color-bg'),
    surface: get('--color-surface'),
    card: get('--color-card'),
    ink: get('--color-ink'),
    inkSecondary: get('--color-ink-secondary'),
    inkMuted: get('--color-ink-muted'),
    accent: get('--color-accent'),
    accentSoft: get('--color-accent-soft'),
    border: get('--color-border'),

    // Semantic
    success: get('--color-success') || '#57c853',
    warning: get('--color-warning') || '#ffa120',
    danger: get('--color-danger') || '#e24856',
    info: get('--color-info') || '#47a2bb',

    // Chart palette — warm, earthy, distinguishable.
    // Ordered for sequential use in multi-series plots.
    // Works in both light and dark mode (calibrated for contrast).
    palette: isDark
      ? [
          '#d4a070', // accent (warm gold)
          '#7ec4a5', // sage green
          '#e2857b', // terracotta rose
          '#8bb4d9', // dusty blue
          '#c9a8e2', // lavender
          '#e6c468', // golden yellow
          '#6bc5c2', // teal
          '#d4847a', // muted coral
        ]
      : [
          '#9b4230', // accent (burnt sienna)
          '#3d7a5f', // forest green
          '#b85c4a', // terra cotta
          '#4a7fa8', // steel blue
          '#7a5b9e', // plum
          '#c4882d', // amber
          '#2a8a87', // dark teal
          '#a0513e', // rust
        ],

    // Grid/axis styling
    gridColor: isDark ? 'rgba(184, 173, 144, 0.12)' : 'rgba(44, 37, 29, 0.08)',
    axisColor: isDark ? 'rgba(184, 173, 144, 0.3)' : 'rgba(44, 37, 29, 0.2)',

    // Font stack (matches site)
    fontSerif: 'Literata, ui-serif, Georgia, serif',
    fontSans: 'system-ui, -apple-system, Segoe UI, sans-serif',
    fontMono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  };
}

/**
 * Observe theme changes (dark mode toggle) and re-render.
 * @param {Function} callback - Called with new theme when mode changes.
 * @returns {Function} cleanup - Call to stop observing.
 */
export function onThemeChange(callback) {
  const observer = new MutationObserver(() => {
    callback(getTheme());
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  return () => observer.disconnect();
}
