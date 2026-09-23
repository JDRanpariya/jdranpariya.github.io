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

The homepage content has one source: `content/research-home.md`. Theme headings use an explicit Markdown identifier such as `## Memory {#memory}` so URLs stay stable when the visible title changes. Theme headings in the root list are plain text. Only an explicit Markdown link such as `[related question](note:memory)` opens another pane.

Open `/\?edit=1` or press Alt+E for the private authoring controls. The Markdown editor previews locally and saves a browser draft. After choosing the `personal-site` repository folder once, Save writes directly to `apps/research/content/research-home.md`. The public page renders no authoring controls.

The note trail uses Scholium's focus model: panes keep a readable width in a native horizontal strip, geometrically occluded ancestors expose 40 px labeled rails, focus does not discard the open path, and compact path controls remain available on narrow screens. Repeated `notes` parameters and `noteFocus` preserve the complete view in browser history and copied URLs.

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

Annotation writes require the private admin session. The passphrase and session-signing key are stored as Cloudflare Worker secrets; neither value is committed to Git. The API validates collections, decisions, note lengths, and record IDs before writing to D1.

## Deployment

The root repository deploys `jdranpariya.com` through GitHub Pages. This nested app deploys independently to the `jdranpariya-research` Worker in Jay's personal Cloudflare account. Cloudflare D1 stores private annotations, and `research.jdranpariya.com` is a Worker custom domain. ChatGPT and OpenAI Sites are not part of the deployment or authentication path.

### Normal deployment workflow

Run every command from this directory:

```sh
cd /Users/jdranpariya/Developer/projects/personal-site/apps/research
```

1. Pull the latest committed source:

   ```sh
   git pull --ff-only origin main
   ```

2. Edit the site. Homepage research content lives in `content/research-home.md`.

3. Preview locally when the change needs visual review:

   ```sh
   bun install
   bun run dev
   ```

   Open the local URL printed by the command. Stop the server with Ctrl+C.

4. Validate and build the exact Worker artifact:

   ```sh
   bun run lint
   bun run build
   ```

   The deployable Worker configuration is generated at `dist/server/wrangler.json`.

5. Commit and push the reviewed source:

   ```sh
   git status --short
   git diff --check
   git add content/research-home.md
   git commit -m "Describe the research change"
   git push origin main
   ```

   Add every changed source file when the work includes code or data outside the homepage Markdown.

6. Deploy the generated artifact to Cloudflare:

   ```sh
   bunx wrangler deploy --config dist/server/wrangler.json
   ```

   A successful deployment prints both the `workers.dev` address and `research.jdranpariya.com (custom domain)` plus a version ID.

7. Verify the live site and private boundary:

   ```sh
   curl -sS -o /dev/null -w 'home: %{http_code}\n' \
     https://research.jdranpariya.com/

   curl -sS -o /dev/null -w 'library: %{http_code} -> %{redirect_url}\n' \
     https://research.jdranpariya.com/library/great-minds
   ```

   The homepage should return `200`. A signed-out library request should redirect to `/login`. Then check the changed page in a browser and sign in once to confirm private library access when authentication or database code changed.

### One-time setup on a new machine or Cloudflare account

Install dependencies and authenticate Wrangler with the personal Cloudflare account:

```sh
bun install
bunx wrangler login
bunx wrangler whoami
```

`whoami` must show `jaydeepranpariya037@gmail.com` before deploying this production site.

The current D1 database binding and custom domain are declared in `vite.config.ts`. If recreating the infrastructure, create a database, replace the database ID in that file, and apply the schema:

```sh
bunx wrangler d1 create jdranpariya-research
bunx wrangler d1 execute jdranpariya-research --remote \
  --file drizzle/0000_thin_madripoor.sql
```

Build and deploy once, then configure the private values through Wrangler's hidden prompts:

```sh
bun run build
bunx wrangler deploy --config dist/server/wrangler.json
bunx wrangler secret put RESEARCH_ADMIN_PASSPHRASE \
  --config dist/server/wrangler.json
openssl rand -hex 32 | bunx wrangler secret put RESEARCH_SESSION_SECRET \
  --config dist/server/wrangler.json
```

Do not place either secret in source files, shell history, GitHub, or the README. Normal content and code deployments do not require resetting them.

### Catalog and database changes

When a source census CSV changes, regenerate the server-side catalogs before validating and deploying:

```sh
bun run catalog:build
bun run lint
bun run build
```

When the annotation schema changes, generate and review a new migration, apply it to the remote D1 database, and only then deploy code that depends on it:

```sh
bun run db:generate
bunx wrangler d1 execute jdranpariya-research --remote \
  --file drizzle/NEW_MIGRATION.sql
```

Replace `NEW_MIGRATION.sql` with the reviewed migration path. Database migrations should not be rerun merely for content or interface changes.
