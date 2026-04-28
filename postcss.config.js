import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import purgecss from "@fullhuman/postcss-purgecss";

export default {
  plugins: [
    tailwindcss,
    autoprefixer,
    ...(process.env.ELEVENTY_ENV === "prod"
      ? [
          purgecss({
            content: ["./src/**/*.{html,njk,md,js,ts}", "./assets/js/**/*.js"],
            // Tailwind's arbitrary-value syntax uses [], (), and . inside the
            // class name (e.g. aspect-[2/3]). The stock regex /[\w-/:]+/ tokenizes
            // "aspect-[2/3]" as "aspect-" + "2/3", so PurgeCSS never sees the
            // real class and strips .aspect-\[2\/3\] from prod CSS.
            //
            // Use Tailwind's recommended extractor: everything that isn't a
            // structural HTML/JSX character.
            defaultExtractor: (content) => content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [],
            safelist: {
              standard: [
                // Bare :focus-visible rule has no class token to match.
                /^:focus-visible$/,
                // img preflight rule is loaded by the {% image %} shortcode at
                // build-time — no source template has a literal <img tag for
                // PurgeCSS to discover.
                /^img$/,
              ],
              // Component classes composed via @apply. PurgeCSS sees them in
              // templates, but arbitrary-value selectors inside @apply can
              // still get dropped — safelist defensively.
              greedy: [
                /^prose-site/,
                /^btn(-primary|-ghost|-link)?$/,
                /^chip$/,
                /^badge$/,
                /^eyebrow$/,
                /^nav-link$/,
                /^index-(list|row)(__.*)?$/,
                /^card-media(__.*)?$/,
                /^post-hero(__.*)?$/,
                /^field(-label|-input|-help)?$/,
                /^callout/,
                /^references-block$/,
                /^subtitle-note$/,
                /^toc(-toggle|-content)?$/,
                /^skip-to-content$/,
                /^required$/,
                // Guestbook notecard system (sanctioned exception — see
                // .notecard block in input.css). Themes are selected via
                // data-theme attributes, so the selectors won't appear as
                // class tokens in markup. Safelist defensively.
                /^notecard(-wall|-empty)?(__.*)?$/,
                /^composer(__.*)?$/,
                /^guestbook-credit$/,
              ],
            },
          }),
        ]
      : []),
  ],
};
