export default {
  content: ["./src/**/*.{html,njk,js,md}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        card: "var(--color-card)",
        primary: "var(--color-text)",
        secondary: "var(--color-text-secondary)",
        muted: "var(--color-text-light)",
        accent: "var(--color-accent)",
        border: "var(--color-border)",
      },
      fontFamily: {
        sans: ["system-ui", "sans-serif"],
        serif: ["Merriweather", "serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
