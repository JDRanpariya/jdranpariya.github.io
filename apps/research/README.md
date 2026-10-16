# Research site

Source for [research.jdranpariya.com](https://research.jdranpariya.com), in the personal-site repository. Public pages use Eleventy 3, Markdown and shared Nunjucks layouts, without React rendering or hydration. The personal site's `assets/js/codex-notes.js` progressively adds note trails. A small Cloudflare Worker handles the private library, D1-backed selected index and authentication. React remains only in the private library editor; there is no Next.js server.

## Pages and data

- `/`: public research questions. `content/research-home.md` is the only source for this prose. Eleventy renders the complete document; JavaScript is optional. No public note pages have been authored yet.
- `/index`: entries Jay has chosen to publish. The Worker reads D1 on each request and renders the selected records with the same ahead-of-time-compiled Nunjucks partial used by Eleventy. Only records marked `Keep` **and** `Publish` appear. The page works without JavaScript; a small progressive enhancement adds filtering and search, without React or runtime template compilation.
- `/reinforcement-learning/`: Jay's public RL topic groups and linked review-paper reading list, authored in `site/reinforcement-learning/index.md`. Eleventy renders ordinary Markdown headings and paper lists without a login or JavaScript. The shared navigation links to it as RL. The private `/library/rl` lab workspace remains separate.
- `/neuro-ai/`: Jay's public NeuroAI topic groups and linked review-paper reading list, authored in `site/neuro-ai/index.md`. It uses the same static reading layout as RL. This reading list is separate from the authenticated `/library/neuroai` lab workspace.
- `/bio-inspired/`: Jay's public bio-inspired topic groups and linked review-paper reading list, authored in `site/bio-inspired/index.md`. It shares the RL and NeuroAI reading layout. The section navigation is RL · NeuroAI · Bio-inspired · AI for science · Index; Jay Ranpariya links back to the homepage without a separate Research item.
- `/ai-for-science/`: Public AI for science interests and reading list at `site/ai-for-science/index.md`. Navigation, canonical routes and admin access share `lib/reading-pages.mjs`; register future reading pages there.
- `/library/great-minds`, `/library/neuroai`, `/library/rl`, `/library/bio-inspired` and `/library/ai-for-science`: private annotation workspaces. The Worker authenticates before serving a page or record data. The browser receives 40 records at a time and loads more while scrolling.
- `data/source/`: reviewed census snapshots. `data/catalogs/`: generated JSON bundled only in the Worker, not the public client JavaScript. D1 stores decisions and notes; source rows remain unchanged.

The research subdomain keeps its own Figtree / Source Serif 4 typography and white, black, and red visual system. It shares Eleventy with the personal site, not the personal site's visual theme.

RL, NeuroAI, Bio-inspired and AI for science begin with linked topic headings and plain nested bullet subtopics, followed by the unchanged paper lists. The overview is authored as ordinary Markdown before `Start here` or `Reading list`; `interestOverview: true` applies the shared two-column desktop / single-column phone styling to its first list. Only the main topic headings link to sections. Topic links use explicit heading identifiers such as `{#continual-adaptation}`. Eleventy uses the same Markdown renderer as research notes and the admin preview, so these anchors work without client JavaScript or a diagram dependency.

## Build and local preview

All registered reading pages and published notes use `public.njk`, with shared navigation, a normal article, and the personal site's note-trail controller. Internal
links to these pages, the homepage or published notes open sliding panes without
a full navigation; source panes keep their scroll position. Section anchors stay
in the current page, external links stay external, and modifier-clicks retain
normal browser behavior. The initial HTML remains readable without JavaScript.
The admin exposes their exact Markdown sources through the shared reading-page
registry and uses the public layout for their previews.

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

Run `bun run check` for lint, unit tests, and a fresh build. With the local Worker running, `bun run check:smoke` verifies the public pages and signed-out private boundary. Run `bun run catalog:build` after any source CSV changes, then build again. The RL catalog merges `data/source/rl_census_europe.csv` and `data/source/rl_census_world.csv` (Europe wins on a duplicate URL or name); if neither file exists, `data/catalogs/rl.json` is written as an empty array. Its `elite`, evidence and activity fields stay inside the Worker. `data/source/additional_neuroai_people.csv` contains only public directory fields (name, institution, country, URL); the catalog build adds people not already represented by a NeuroAI lab lead. Never commit the private outreach census, fit rankings, recruiting status, contact rules, or evidence from the research-program folder. The Worker also strips source-only fields before sending records to either the private library or `/index`. Jay's own fit assessment is saved separately with his private annotations, initially unset.

## Deployment and boundaries

### Updating the reviewed lab inventories

The reviewed release of 15 October 2026 contains NeuroAI 633, Bio-inspired 510, AI/ML for Science 1,018 and RL 562. Great Minds now contains 893 people and 996 reading paths after the historical expansion: 518 retained from the original 872 and 375 additions across history. The 354 withheld originals and their annotations remain recoverable. The first three tracks contain 2,107 distinct units; memberships overlap. The emerging-groups follow-up adds 23 memberships: 22 new identities and Michael Frank’s LNCC, already present in RL, now also in NeuroAI with the same stable ID. Existing IDs, resource records and annotations are preserved. Research quality evaluation belongs to Jay.

The latest audit and source-linked additions are in `/Users/jdranpariya/Developer/AGI/neuroai-census/canonical-v3/audits/emerging-groups-2026-10-15/report.md`. The canonical folder retains source frames, identity reconciliation and review decisions. All eight named follow-ups in this batch are resolved. Optional personal-team-site and research-plan discovery for new additions remains marked partial; this update completes discovery verification and catalog publication.

After evidence review and stable-ID reconciliation, the audit's exporter writes `final/reviewed-census-v3.json`. The release ledger contains only reviewed memberships, including the resumed MathAI work; withheld proposals stay in the working ledger:

```sh
cd /Users/jdranpariya/Developer/AGI/neuroai-census/canonical-v3
python3 scripts/export_census.py --reviewed \
  --ledger audits/release-entity-ledger.json \
  --resources source/public-lab-resources.json --resources-reviewed
python3 scripts/validate_exports.py --folder final --ledger audits/release-entity-ledger.json
```

The approval in `audits/final-review.json` must match both the ledger and public-resource SHA-256 hashes. Changing either requires a new evidence review before export. Copy `final/reviewed-census-v3.json` to this app's `data/source/reviewed-census-v3.json` and the approved public resources to `data/source/lab-research-resources.json`, then run `bun run catalog:build` and `bun run check`. The builder rejects draft inventories, mismatched collection IDs and private annotation fields. Never substitute an unreviewed working ledger for this manifest.

This is a catalog update only. It does not migrate, delete or overwrite D1 notes or decisions. Existing records keep their collection IDs; removed records' annotations stay in D1. A record shared across research topics can appear in multiple collections. Those collections have separate annotation records unless an explicit existing alias provides inheritance. New collections use the existing annotation schema and require no migration.

The root personal site deploys separately to GitHub Pages. This app deploys to the existing `jdranpariya-research` Cloudflare Worker custom domain. `wrangler.jsonc` declares the existing D1 database binding and route. Cloudflare's static-assets binding serves Eleventy output, while Worker-first routes protect the library and render `/index` from D1. A deployment uploads both the Worker and the static pages together.

Existing fit assessments use the additive `drizzle/0001_far_vampiro.sql` migration. The fit control is now hidden; saved assessments remain in D1. Apply this migration only if the intended database does not already have it. Do not replace the database or rerun the initial schema against an existing one. After review, deploy from `apps/research` with:

```sh
bun run lint
bun run build
bunx wrangler whoami
bunx wrangler deploy --config wrangler.jsonc
```

Confirm `whoami` identifies Jay's personal Cloudflare account before deploying. The lab-resource interface requires no new database migration. Do not apply unrelated schema migrations for content or interface-only changes. Existing session tokens remain valid because the Worker uses the same cookie name and HMAC format as the previous app. Existing D1 rows and secrets are reused; no data copy is part of this migration.

Post-deploy checks: `/` and `/index` return `200`; a signed-out `/library/great-minds` redirects to `/login`; sign in once and confirm the editor loads, an annotation saves, and only deliberately published public notes appear on `/index`. The raw catalogs, private notes, and credentials must not appear in public HTML or static assets.

## Editing research notes

The personal site's authenticated `/admin/` editor supports both sites. In the Research site tree, every folder has New file and New folder actions. Creating a folder creates its `index.md`, with automatic links to immediate published children. New files and folders start as browser-local drafts, not repository changes. Markdown source belongs under `apps/research/content/`; `research-home.md` remains the homepage source.

For example, `content/memory/index.md` becomes `/notes/memory/`, and `content/memory/sleep.md` becomes `/notes/memory/sleep/`. The generated frontmatter includes the correct research permalink and layout. Set `status: "published"` when ready. The admin Publish action saves the source to GitHub; new note pages require a research build/deploy to become live. Only published sources enter the static HTML, public bootstrap data and sitemap. `/notes/` lists top-level notes and folders when published notes exist. `/index` remains the separately curated D1-backed research index.

The homepage and note pages render ordinary Markdown using the same renderer as the admin preview. Headings, paragraphs, emphasis, lists, quotes and galleries retain their authored order; the homepage does not convert headings into a generated bullet list. Optional identifiers such as `## Memory {#memory}` provide stable heading anchors. Wiki links such as `[[Memory]]` and Markdown links to `/notes/memory/` open native sliding panes without refreshing the current note. They also have ordinary canonical URLs that work without JavaScript. Headings do not create note pages. Hover or keyboard focus previews a linked note; clicking commits it to a horizontal trail. Existing slug-based `?notes=` URLs remain supported. Built HTML is the single published version: the browser no longer fetches a competing homepage copy from GitHub.

The private library is for annotating census records, not editing the public research questions.

## Lab sites and research plans

RL and NeuroAI records show verified independent personal sites for leads and current team members, with links to published research plans, proposals, roadmaps and substantive research statements where found. Institutional faculty profiles remain accessible through the lab's site; they are not treated as independent personal websites. Ordinary interests pages, publication lists and short funding summaries do not qualify as plans. Great Minds instead shows a sourced perspective and linked reading/viewing paths, with access and translation notes. The old inferred Life question is cleared from this active catalog.

Reviewed resources live in `data/source/lab-research-resources.json`, keyed by collection and existing record ID. The catalog builder joins them to the source census without changing IDs. Raw source evidence and unresolved checks are kept outside this repository in the dated lab-research-plans audit folder. A fetch cache alone is never imported as reviewed evidence. To validate a reviewed result batch and rebuild:

```sh
python3 scripts/import-lab-resources.py /absolute/path/to/reviewed/results --exclusions /absolute/path/to/plan-exclusions.json --require-complete
bun run catalog:build
bun run check
```

If the audit includes independent rejection decisions, pass `--exclusions /absolute/path/to/plan-exclusions.json` to the importer. These URL/reason pairs prevent rejected summary pages from being reintroduced by an older result batch.

`--require-complete` prevents a final import when a catalog ID is missing or a review remains `partial`. Omit it only when validating a work-in-progress batch. A `source_limited` result is completed work with a documented evidence limit, such as an inaccessible or conflicting roster.

Pass the audit's `plan-exclusions.json` on every import. The raw evidence ledger can retain a candidate document that the independent review rejected; the exclusions prevent that candidate from appearing as a research plan.

Each resource carries its evidence URL; each entry carries a review date and `checked`, `partial` or `source_limited` status. Missing plans mean none were found in the inspected sources, not that a person has no research plan. Incomplete reviews are identified in the interface.

The visible decisions are Unreviewed, Keep and Remove. Legacy Maybe decisions appear under Unreviewed and remain preserved in D1 until Jay explicitly changes the decision. Editing a note does not silently change its old decision or fit assessment. Private notes and deliberately published public notes retain their existing behavior.

## Catalog membership review

`data/source/catalog-membership.json` records sourced NeuroAI inclusion decisions. Generic robotics, RL or machine learning does not establish NeuroAI relevance. A retained record needs a specific biological intelligence, neural learning, memory, representation, sensorimotor or computational mechanism. Researchers can legitimately appear in both NeuroAI and RL when both connections are supported.

To validate a complete audit and rebuild:

```sh
python3 scripts/import-catalog-membership.py /absolute/path/to/classification-results --require-complete --ledger /absolute/path/to/membership-ledger.csv
bun run catalog:build
bun run check
```

The original census CSVs remain intact. Excluded or unresolved entries are hidden from the active NeuroAI catalog. Strong RL moves resolve to an existing RL entry when possible; otherwise they preserve the original record ID in RL. The generated `membership-aliases.json` lets a moved entry inherit its original private annotation until the destination has its own saved annotation. Existing destination edits take precedence; source annotations are never deleted or overwritten. Excluded entries' annotations remain in D1 and reappear if the entry is restored. Source-limited or pending resource reviews keep their separate review status.

Sourced corrections to canonical metadata live in `data/source/catalog-metadata-corrections.json`; they change displayed metadata without changing record IDs.

## Great Minds: approaches and reading

The 15 October 2026 release uses expressed approaches to life, inquiry and creative practice as its inclusion rule. Achievement and reputation alone are insufficient. It contains 893 people with 996 linked works; all 872 original records have a recorded decision. New discoveries include historical and living people beyond that baseline.

The reviewed source is `data/source/great-minds-reflections.json`. Its source packets, all screening decisions, source-access records and reconciliation code live at `/Users/jdranpariya/Developer/AGI/great-minds-web-census/historical-expansion-2026-10-15/`. Start with that folder’s `README.md` and `reports/final-review.md`. The original `data/source/great_minds_census.csv` is unchanged. The importer rejects partial baseline audits, changed baseline hashes, identity changes and private annotation fields.

To rebuild after a reviewed directory update:

```sh
cd /Users/jdranpariya/Developer/AGI/great-minds-web-census/historical-expansion-2026-10-15
python3 tools/reconcile.py --finalize
cp reviewed-great-minds-reflections.json /Users/jdranpariya/Developer/projects/personal-site/apps/research/data/source/great-minds-reflections.json
cd /Users/jdranpariya/Developer/projects/personal-site/apps/research
bun run catalog:build
python3 scripts/test_great_minds_reflections.py
bun run check
bunx wrangler whoami
bunx wrangler deploy --config wrangler.jsonc
RESEARCH_BASE_URL=https://research.jdranpariya.com bun scripts/smoke-research.mjs
```

Run `tools/validate_release.py` from the dated audit folder before deployment; its source/hash/link checks must pass against the rebuilt catalog. Refresh changed URLs through `tools/check_links.py` before validating. Confirm the existing personal Cloudflare account in `whoami`; no new account, auth provider or database migration is required. The baseline IDs remain stable, new people get deterministic IDs, and removed entries’ notes stay in D1. This process changes the active source projection only. The library still uses incremental loading and existing editing controls. Search also matches alternate names, work titles, perspective text and accent-free spellings.
