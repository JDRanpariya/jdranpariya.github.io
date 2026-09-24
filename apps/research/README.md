# Research site

Source for [research.jdranpariya.com](https://research.jdranpariya.com), in the personal-site repository. The public site uses Eleventy 3. A small Cloudflare Worker handles the private library, D1-backed selected index, and authentication. The React components are client islands for sliding notes, index filtering, and the private editor; there is no Next.js server.

## Pages and data

- `/`: public research questions. `content/research-home.md` is the only source for this prose. Eleventy builds the initial HTML so the page is readable without JavaScript. React hydrates the sliding-note interface. No public note pages have been authored yet.
- `/index`: entries Jay has chosen to publish. The Worker reads D1 on each request and server-renders the selected records. Only records marked `Keep` **and** `Publish` appear. The page works without JavaScript; React adds filtering and search.
- `/library/great-minds` and `/library/neuroai`: private annotation workspace. The Worker authenticates before serving a page or record data. The browser receives only the current 40-record page, not the entire catalogs.
- `data/source/`: reviewed census snapshots. `data/catalogs/`: generated JSON bundled only in the Worker, not the public client JavaScript. D1 stores decisions and notes; source rows remain unchanged.

The research subdomain keeps its own Figtree / Source Serif 4 typography and white, black, and red visual system. It shares Eleventy with the personal site, not the personal site's visual theme.

## Build and local preview

Install the research app dependencies. It now declares its own Eleventy and build tools; installing the personal-site root package is not required to build this app:

```sh
cd /Users/jdranpariya/Developer/projects/personal-site
cd apps/research
bun install
bun run lint
bun run build
```

`bun run build` renders the public homepage, builds Eleventy pages into `_site/`, bundles the React islands/CSS into `_site/assets/`, and bundles the Worker into `dist/worker.js`.
Stop the local Worker before a fresh build, then restart it: the build replaces `_site/`, and an already-running Wrangler asset watcher can hold a stale manifest.

For a full local preview, initialize a **local** D1 database and run the Worker:

```sh
bunx wrangler d1 execute jdranpariya-research --config wrangler.jsonc --local \
  --file drizzle/0000_thin_madripoor.sql
bun run start
```

Open `http://127.0.0.1:8790/`. Local private-library testing needs temporary local `RESEARCH_ADMIN_PASSPHRASE` and `RESEARCH_SESSION_SECRET` bindings. Never place production secrets in source, a checked-in file, or a command line. `wrangler dev` can read local values from an ignored `.dev.vars` file if Jay elects to create one.

Run `bun run check` for lint, unit tests, and a fresh build. With the local Worker running, `bun run check:smoke` verifies the public pages and signed-out private boundary. Run `bun run catalog:build` after either source CSV changes, then build again.

## Deployment and boundaries

The root personal site deploys separately to GitHub Pages. This app deploys to the existing `jdranpariya-research` Cloudflare Worker custom domain. `wrangler.jsonc` declares the existing D1 database binding and route. Cloudflare's static-assets binding serves Eleventy output, while Worker-first routes protect the library and render `/index` from D1. A deployment uploads both the Worker and the static pages together.

After review, deploy from `apps/research` with:

```sh
bun run lint
bun run build
bunx wrangler whoami
bunx wrangler deploy --config wrangler.jsonc
```

Confirm `whoami` identifies Jay's personal Cloudflare account before deploying. Never apply a D1 schema migration just to deploy content or interface changes. Existing session tokens remain valid because the Worker uses the same cookie name and HMAC format as the previous app. Existing D1 rows and secrets are reused; no data copy is part of this migration.

Post-deploy checks: `/` and `/index` return `200`; a signed-out `/library/great-minds` redirects to `/login`; sign in once and confirm the editor loads, an annotation saves, and only deliberately published public notes appear on `/index`. The raw catalogs, private notes, and credentials must not appear in public HTML or static assets.

## Editing research notes

There is no browser editor for public research notes. Edit `content/research-home.md` in the repository and rebuild/deploy. Theme headings use an explicit Markdown identifier such as `## Memory {#memory}`. The questions under each theme remain in the main body. The sliding interface is ready for separately authored notes when a source for them is added, but there are no demo notes or note pages. The published page also fetches the latest copy of the homepage Markdown from GitHub on load; the build remains its stable fallback.

The private library is for annotating census records, not editing the public research questions.
