# Social previews

Both sites resolve their social metadata in `scripts/site-metadata.mjs`, using
`src/_data/site.json`. A research URL must use a research-hosted thumbnail, never
the personal site's default image. Image URLs include a stable fingerprint of
the title, description, canonical URL and image revision to refresh image caches
when their content changes.

`scripts/generate-og-images.py` runs **after** Eleventy. It reads the actual
rendered Open Graph fields, including generated indexes and nested notes, rather
than maintaining a separate source-file/frontmatter parser. Each page gets its
own image. The generator uses the current Figtree and Source Serif 4 webfonts,
instantiated in `.cache/og-fonts/`; no old font binaries are used.

All cards are 1200 by 630 pixels. Generation fails on missing descriptions,
cross-site image URLs, conflicting page-to-image mappings, clipped glyphs,
incorrect dimensions, or images larger than 1 MB. The public output's
`assets/og/audit.json` records every page, image, byte count and text bounds.
`bun run check:metadata` checks rendered metadata and runs renderer regressions.

## Research homepage screenshot

The research homepage deliberately uses a real first-screen screenshot, not a
text card. The versioned JPEG lives under `apps/research/public/assets/og/` and
is referenced by `site.research.image`. It is copied unchanged by Eleventy.

When that homepage changes, capture the public page at the very top in a
1200-by-630 browser viewport with fonts loaded. Capture only the viewport
(`fullPage: false`), not the full document, and do not include browser chrome.
Save a new versioned image and update `site.research.image`. Other research
pages receive their own title cards, not the homepage screenshot.

## Build and deployment

The personal production build runs `bun run og:generate` after HTML generation.
The research app runs `build:og` after `build:11ty`. Both use the root Python
requirements (`bun run setup:python`), including Brotli support for the webfonts.
Generated cards live only in each build's `assets/og/`; they are not source files.
The research screenshot is a committed source asset.

Deploy the personal site through its normal GitHub Pages workflow and deploy
the research app separately through its existing Cloudflare Worker. Do not
include unrelated working-tree changes in either release.
