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
            content: [
              "./src/**/*.{html,njk,md,js,ts}",
              "./assets/js/**/*.js", // classes referenced from delegated JS handlers
            ],
            // Tailwind's arbitrary-value syntax uses [], (), and . in class
            // names (e.g. aspect-[2/3], w-[min(100%,40rem)], max-w-[85ch]).
            // The stock regex /[\w-/:]+/ tokenizes "aspect-[2/3]" as
            // "aspect-" + "2/3", so PurgeCSS never sees the real class and
            // strips .aspect-\[2\/3\] from prod CSS — manifests as book
            // covers rendering at intrinsic aspect instead of 2:3.
            //
            // Tailwind's recommended extractor: everything that isn't a
            // structural HTML/JSX character. See:
            // https://tailwindcss.com/docs/content-configuration#customizing-extraction-logic
            defaultExtractor: (content) => content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [],
            safelist: {
              // The bare :focus-visible rule in input.css has no class token
              // for PurgeCSS to find in content; keep it by selector match.
              standard: [/^:focus-visible$/],
            },
          }),
        ]
      : []),
  ],
};
