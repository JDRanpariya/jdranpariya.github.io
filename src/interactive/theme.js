/**
 * Interactive Theme — syncs with the site's CSS custom properties.
 * All interactive modules should pull colors from here so charts,
 * diagrams, and 3D scenes match the site's light editorial palette
 * in the site's light-only palette.
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
  return {
    isDark: false,
    // Core
    bg: get("--color-bg"),
    surface: get("--color-surface"),
    card: get("--color-card"),
    ink: get("--color-ink"),
    inkSecondary: get("--color-ink-secondary"),
    inkMuted: get("--color-ink-muted"),
    accent: get("--color-accent"),
    accentSoft: get("--color-accent-soft"),
    border: get("--color-border"),

    // Semantic
    success: get("--color-success") || "#57c853",
    warning: get("--color-warning") || "#ffa120",
    danger: get("--color-danger") || "#e24856",
    info: get("--color-info") || "#47a2bb",

    // Chart palette — inspired by Physical Intelligence (π) website's
    // muted, earthy, archival aesthetic. Warm but restrained.
    // Ordered for sequential use in multi-series plots.
    palette: [
      get("--color-accent"), // site's red accent
      "#4C7E4D", // forest green
      "#C4882D", // amber/ochre
      "#4a7fa8", // steel blue
      "#7a5b9e", // plum
      "#A8A179", // warm grey-olive
      "#2a8a87", // dark teal
      "#b8321c", // red accent for the final series
    ],

    // Grid/axis styling
    gridColor: "rgba(18, 18, 18, 0.08)",
    axisColor: "rgba(18, 18, 18, 0.2)",

    // Font stack (matches site)
    fontSerif: "Source Serif 4, ui-serif, Georgia, serif",
    fontSans: "system-ui, -apple-system, Segoe UI, sans-serif",
    fontMono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  };
}
