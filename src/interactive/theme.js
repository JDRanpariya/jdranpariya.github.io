/**
 * Interactive Theme — syncs with the site's CSS custom properties.
 * All interactive modules should pull colors from here so charts,
 * diagrams, and 3D scenes match the site's "Golden Peachy Glow" palette
 * and respond to dark mode automatically.
 *
 * Inspired by Physical Intelligence (π)'s warm, archival color usage in data visualizations.
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

    // Chart palette — inspired by Physical Intelligence (π) website's
    // muted, earthy, archival aesthetic. Warm but restrained.
    // Ordered for sequential use in multi-series plots.
    // Works in both light and dark mode (calibrated for contrast).
    palette: isDark
      ? [
          '#d4a070', // warm gold (accent)
          '#9CBE70', // sage green
          '#E5C65B', // archival gold
          '#8bb4d9', // dusty blue
          '#B7C8C9', // muted teal-grey
          '#e2857b', // terracotta rose
          '#c9a8e2', // lavender
          '#6bc5c2', // teal
        ]
      : [
          '#9b4230', // burnt sienna (accent)
          '#4C7E4D', // forest green
          '#C4882D', // amber/ochre
          '#4a7fa8', // steel blue
          '#7a5b9e', // plum
          '#A8A179', // warm grey-olive
          '#2a8a87', // dark teal
          '#b85c4a', // terra cotta
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
