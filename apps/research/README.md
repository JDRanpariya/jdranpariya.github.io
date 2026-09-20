# Research site

This directory is the source for [research.jdranpariya.com](https://research.jdranpariya.com). It lives inside the canonical personal site repository so its design, source data, and deployment history stay together.

## What is here

- `/` — public research questions.
- `/index` — entries Jay has chosen to publish.
- `/library/great-minds` — private annotation workspace for the great minds census.
- `/library/neuroai` — private annotation workspace for the NeuroAI census.
- `data/source/` — reviewed census CSV snapshots.
- `data/catalogs/` — generated JSON used by the app.
- D1 — decisions and notes. Source census rows remain unchanged.

Only `Keep` records with `Publish` enabled appear in the public index. Private notes are never included in its query or response.

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

The app uses the personal site's Fraunces and Literata fonts and the Golden Peachy Glow color system. Public prose comes from Jay's reviewed material; the editor interface uses short functional labels.

## Data model

The full catalogs stay server side. The private editor requests 40 records at a time and performs search, filtering, and pagination on the server. This keeps the first page small enough to hydrate promptly on both phones and desktop browsers.

Annotation writes require a signed-in user whose normalized email equals `jaydeepranpariya037@gmail.com`. The API validates collections, decisions, note lengths, and record IDs before writing to D1.

## Deployment

The root repository deploys `jdranpariya.com` through GitHub Pages. This nested app is built and published to its OpenAI Sites project from the same canonical commit. The custom domain remains `research.jdranpariya.com`.
