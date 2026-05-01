/* Tailwind config — maps the CSS variables in src/css/input.css to named
 * utilities, and extends the spacing / font-size scales to match DESIGN.md.
 *
 * Everything listed here is backed by a token in DESIGN.md §YAML. If you add a
 * mapping here, add the token + the CSS variable in the same commit.
 */
export default {
  content: ["./src/**/*.{html,njk,js,md}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        card: "var(--color-card)",
        ink: "var(--color-ink)",
        "ink-secondary": "var(--color-ink-secondary)",
        "ink-muted": "var(--color-ink-muted)",
        accent: "var(--color-accent)",
        "accent-soft": "var(--color-accent-soft)",
        border: "var(--color-border)",
        // Notecard palette (guestbook only).         and       flip with
        // the .dark theme via CSS variables in input.css;        /
        //            stay cream-on-sepia in BOTH modes by design — the
        // picker + submit pills read as physical paper chips, tied to
        // the card's aesthetic, not the page chrome.
        notecard: {
          paper: "var(--notecard-paper)",
          ink: "var(--notecard-ink)",
          red: "var(--notecard-red)",
          pill: "#f0e7d6",
          "pill-ink": "#3a2f22",
        },
      },
      fontFamily: {
        serif: ["Literata", "ui-serif", "Georgia", "serif"],
        heading: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        // Named type scale, matches DESIGN.md §4.
        display: [
          "clamp(2.5rem, 4vw + 1rem, 3.25rem)",
          { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        h1: [
          "clamp(2rem, 2.5vw + 1rem, 2.75rem)",
          { lineHeight: "1.15", letterSpacing: "-0.015em", fontWeight: "700" },
        ],
        h2: ["1.875rem", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        h3: ["1.6875rem", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
        h4: ["1.375rem", { lineHeight: "1.5" }],
        lead: ["1.375rem", { lineHeight: "1.6" }],
        body: ["1.25rem", { lineHeight: "1.85" }],
        "body-sm": ["1.0625rem", { lineHeight: "1.7" }],
        ui: ["0.9375rem", { lineHeight: "1.5" }],
        "ui-sm": ["0.8125rem", { lineHeight: "1.5", letterSpacing: "0.02em" }],
        "ui-xs": ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.05em" }],
      },
      maxWidth: {
        reading: "min(65ch, 100% - 3rem)",
        content: "44rem",
        wide: "64rem",
        page: "89rem",
      },
      borderRadius: {
        none: "0",
        sm: "4px",
        md: "6px",
        lg: "10px",
        full: "9999px",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        sheet: "var(--shadow-sheet)",
        // Notecard card lift on hover — warm-biased, matches the paper
        // palette. Same recipe for light + dark; the rgba channel stays
        // sepia because the card itself is always paper-coloured.
        "notecard-hover": "0 1px 2px rgba(52, 28, 8, 0.06), 0 8px 20px rgba(52, 28, 8, 0.1)",
        // Ky.fyi-style 4-layer pill shadow, defined as a CSS variable in
        // input.css so it can flip between sepia-on-cream (light mode)
        // and neutral-black (dark mode). Previously this was a hardcoded
        // sepia rgba string, which in dark mode read as a warm glow/halo
        // behind the cream pills instead of a shadow. See the
        //                   definition in input.css for the recipe.
        "notecard-pill": "var(--notecard-pill-shadow)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
        slow: "300ms",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
