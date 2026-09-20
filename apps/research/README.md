# Research site

This directory is the source for [research.jdranpariya.com](https://research.jdranpariya.com). It lives inside the canonical personal site repository so its source data and deployment history stay together. The research site has its own information architecture and visual system.

## What is here

- `/` — public research questions.
- `/index` — entries Jay has chosen to publish.
- `/library/great-minds` — private annotation workspace for the great minds census.
- `/library/neuroai` — private annotation workspace for the NeuroAI census.
- `data/source/` — reviewed census CSV snapshots.
- `data/catalogs/` — generated JSON used by the app.
- D1 — decisions and notes. Source census rows remain unchanged.

Only `Keep` records with `Publish` enabled appear in the public index. Private notes are never included in its query or response.

## Information architecture

The site has two surfaces:

- **Public research:** Research at `/` and Jay's selected records at `/index`.
- **Private workspace:** The two library collections, where Jay reviews, annotates, and publishes records.

Public pages share one compact navigation. The library uses contextual links for moving back to the public pages and keeps its collection controls inside the workspace. Primary navigation is never placed in a footer.

### Research notes

The homepage is the root of a note trail. Each theme in `data/research-themes.ts` has a stable `slug`; its title opens as a note and is encoded in repeated `notes` query parameters. Browser Back and Forward rebuild the trail, so a copied URL opens the same note context.

Add another theme slug to a theme's optional `links` array to expose a link from that note. Registered note links open in the stack on desktop, show a preview on hover or keyboard focus, and behave as ordinary single-page navigation below 801 px. External and modifier-clicked links keep the browser's normal behavior.

## Local work

```sh
bun install
bun run catalog:build
bun run lint
bunx tsc --noEmit
bun run build
```

Regenerate the catalogs after either source CSV changes:

```sh
bun run catalog:build
```

The app uses self-hosted Figtree for headings and Source Serif 4 for body text, with a neutral white, black, and red visual system inspired by Farnam Street. It does not inherit the personal site's color theme or page components. Public prose comes from Jay's reviewed material; the editor interface uses short functional labels.

## Data model

The full catalogs stay server side. The private editor requests records incrementally and performs search and filtering on the server. This keeps the first response small while continuous loading removes visible numbered pagination.

Annotation writes require a signed-in user whose normalized email equals `jaydeepranpariya037@gmail.com`. The API validates collections, decisions, note lengths, and record IDs before writing to D1.

## Deployment

The root repository deploys `jdranpariya.com` through GitHub Pages. This nested app is built and published to its OpenAI Sites project from the same canonical commit. The custom domain remains `research.jdranpariya.com`.
