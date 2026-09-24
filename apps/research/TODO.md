# Research library state

## Current architecture

- Eleventy 3 builds the public page shells; React hydrates only the interactive notes, index, and private editor.
- A Cloudflare Worker serves Eleventy assets, protects the library, and renders the D1-backed public index.
- Static source catalogs: 872 great minds and 422 countable NeuroAI research units.
- Canonical source: `apps/research` inside the personal site repository.
- Private owner editor: `/library/great-minds` and `/library/neuroai`.
- Public selected index: `/index`.
- D1 stores decisions and notes only; catalog source rows remain immutable.
- A record appears publicly only after `Keep` and `Publish` are both selected.
- Search, decision filters, and pagination run server side in 40-record pages.
- Desktop uses a persistent master/detail workspace; mobile uses a list-to-detail flow.

## Migration verification (2026-09-23 to 2026-09-24)

- The existing remote D1 database ID in `wrangler.jsonc` was queried read-only: `research_annotations` exists and currently has 0 rows. No data migration is required for the framework cutover.
- The existing Worker has both required secret names configured. Secret values were not read.
- The last listed live deployment before cutover is version `caa3d015-359c-46b3-95ba-f57a1bae492e` (2026-09-23 20:44:59 UTC). Recheck immediately before any deploy; use the then-current version as the rollback target.
- Local 11ty/Worker preview passed build, unit, smoke, accessibility, browser, and Wrangler dry-run checks. The root personal site's full `bun run check` passed too.
- After the latest build, Wrangler's bundled esbuild binary stopped launching (exit 137). A forced frozen-lockfile reinstall repaired the local binary without changing `bun.lock`; the deployment dry-run and all 14 route smoke checks passed again. An ignored vinext deployment redirect was moved to `.wrangler/deploy/config.json.vinext-backup` so the new config is unambiguous.
- Jay approved the lockfile update, commit/push, and production deployment on 2026-09-24. The research app now owns its Eleventy/build dependencies; `bun install --frozen-lockfile`, app checks, root checks, formatting, deployment dry-run, and local authenticated save/publish/restore all pass.
- The remote D1 count was rechecked read-only on 2026-09-24: 0 annotations before and after cutover.
- Commit `e2758aa` was pushed to `main`. Cloudflare deployed Worker version `9652f755-7c92-4399-9006-02693209f2c8` to `research.jdranpariya.com` on 2026-09-24; the previous version `caa3d015-359c-46b3-95ba-f57a1bae492e` is the rollback target.
- Production passed all 14 route smoke checks. The homepage and index rendered in a browser; unauthenticated library access redirected to login. Both required production secret names remain configured. The authenticated save/publish/restore flow was verified against local D1 and local test credentials, not the production passphrase.

## Source regeneration

Run `bun run catalog:build` after a source census changes.

## Next

- Use the private library to review and annotate records. Jay can perform an optional owner sign-in check on production without sharing his passphrase.
- Publish selected entries one at a time from the editor.
