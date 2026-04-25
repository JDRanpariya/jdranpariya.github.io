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
      },
      fontFamily: {
        serif: ["Merriweather", "ui-serif", "Georgia", "serif"],
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
        h2: ["1.75rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        h3: ["1.375rem", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        h4: ["1.125rem", { lineHeight: "1.4" }],
        lead: ["1.25rem", { lineHeight: "1.6" }],
        body: ["1.0625rem", { lineHeight: "1.75" }],
        "body-sm": ["0.9375rem", { lineHeight: "1.65" }],
        ui: ["0.9375rem", { lineHeight: "1.5" }],
        "ui-sm": ["0.8125rem", { lineHeight: "1.5", letterSpacing: "0.02em" }],
        "ui-xs": ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.05em" }],
      },
      maxWidth: {
        reading: "min(65ch, 100% - 3rem)",
        content: "44rem",
        wide: "64rem",
        page: "80rem",
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
