# Guestbook Management Guide

Single source of truth for adding, removing, and maintaining notecard
themes and guestbook entries.

---

## File map

| File                                                         | Role                                      |
| ------------------------------------------------------------ | ----------------------------------------- |
| `assets/images/notecards/`                                   | Texture images (the actual cards)         |
| `src/_data/notecardThemes.js`                                | Build-time scan; produces the theme list  |
| `src/_data/guestbook.json`                                   | Existing curated entries (preserved)      |
| `workers/request-intelligence/src/guestbook.js`              | Live submission and moderation API        |
| `workers/request-intelligence/migrations/0001_guestbook.sql` | Additive D1 table                         |
| `admin/components/GuestbookReview.jsx`                       | Authenticated review/hide/restore UI      |
| `assets/js/guestbook-api.js`                                 | Safe card rendering and API requests      |
| `src/guestbook.njk`                                          | Page template (composer + entry cards)    |
| `assets/js/guestbook.js`                                     | Client-side: theme picker + form submit   |
| `src/css/input.css`                                          | Notecard styles, per-theme ink overrides  |
| `scripts/add-notecard.sh`                                    | CLI: JPG/PNG to resized WebP              |
| `scripts/notecard_luminance.py`                              | Measures texture brightness for ink color |
| `docs/notecard-sources.md`                                   | Where to find CC0/PD illustrations        |

### Dead code (safe to delete)

| File                                                  | Why                                                |
| ----------------------------------------------------- | -------------------------------------------------- |
| `scripts/build-notecards.py`                          | Old SVG ornament card generator (retired Apr 2026) |
| `scripts/notecard_illustrations.py`                   | SVG motif library for the above                    |
| `scripts/__pycache__/build-notecards.cpython-312.pyc` | Bytecode cache for the above                       |

---

## How it works

1. **WebP files** in `assets/images/notecards/` are the only source of themes.
2. `notecardThemes.js` scans that folder at build time, excludes retired
   theme keys, sorts alphabetically, then hoists `DEFAULT_KEY` (currently
   `"beige"`) to index 0.
3. `guestbook.njk` uses `themes[0]` as the composer's initial theme and as
   fallback for entries whose saved theme no longer exists.
4. `guestbook.js` reads `window.NOTECARD_THEMES` (injected at build) to
   cycle the picker. It submits JSON to the same-origin `/api/guestbook`
   Worker endpoint and inserts the saved card immediately after success.
5. `input.css` sets the default ink color (`#5a3a24` sepia). Add a
   per-theme override only if a future dark texture needs cream ink.

### Current themes

| Theme     | Ink             | Notes               |
| --------- | --------------- | ------------------- |
| beige     | `#5a3a24` sepia | Default on composer |
| parchment | `#5a3a24` sepia |                     |

`linen` and `navy` are retired and excluded by `RETIRED_KEYS` in
`src/_data/notecardThemes.js`. Existing guestbook entries using either key
fall back to the default theme.

---

## Add a new theme

### Step 1 — Convert image to WebP

```bash
bun run add-notecard ~/Downloads/sunset-paper.jpg sunset
```

This resizes to 840px wide (2× retina), converts to WebP q=85, and saves
as `assets/images/notecards/notecard-sunset.webp`.

Requires `cwebp` (`brew install webp`).

### Step 2 — Check luminance

```bash
python3 scripts/notecard_luminance.py
```

- **LIGHT** or **MID**: do nothing, default sepia ink works.
- **DARK** (lum < 120): add the slug to the ink override in `src/css/input.css`:

```css
/* purgecss start ignore */
[data-theme="linen"],
[data-theme="indigo"],
[data-theme="sunset"] {
  /* <-- add here */
  --notecard-ink: #f0e6d2;
  --notecard-red: #e8b4a8;
}
/* purgecss end ignore */
```

### Step 3 — Rebuild

```bash
bun run build
```

`notecardThemes.js` re-scans the folder. The new theme appears in the
picker automatically. No other code changes needed.

---

## Remove a theme

```bash
rm assets/images/notecards/notecard-<slug>.webp
bun run build
```

Then:

- If it was in the dark-ink group in `input.css`, remove its
  `[data-theme="<slug>"]` line.
- If it was the `DEFAULT_KEY`, change `DEFAULT_KEY` in
  `src/_data/notecardThemes.js` to another slug.

Existing guestbook entries that referenced the removed theme silently
fall back to `themes[0]` (the default). No data loss.

To archive instead of deleting: `mv ... scratch/notecard-sources/`
(`scratch/` is gitignored).

---

## Change the default theme

Edit `DEFAULT_KEY` in `src/_data/notecardThemes.js`:

```js
const DEFAULT_KEY = "cream"; // was "paper"
```

Then `bun run build`. The composer opens with the new theme and
unknown entry keys fall back to it.

---

## Add a guestbook entry manually

Edit `src/_data/guestbook.json`:

```json
{
  "date": "2026-04-28",
  "name": "Visitor Name",
  "message": "Their message here.",
  "url": "https://example.com",
  "theme": "cream"
}
```

- `url`: optional (use `""` to omit)
- `theme`: must match a `notecard-<slug>.webp` on disk; if missing
  or unknown, falls back to `themes[0]`.

Then `bun run build`.

---

## How submissions arrive

The Worker stores new entries in `guestbook_entries` in the existing
`jdranpariya-research` D1 database. No research tables are changed. The
existing curated JSON remains intact and renders without JavaScript.
Live entries load in pages of 24. New notes do not require a build/deploy.

Protection is layered, inspired by [Ky Decker's backend](https://github.com/kydecker/ky.fyi/blob/main/src/pages/api/guestbook.ts):

- A honeypot rejects basic automated form fills.
- A short-lived, signed challenge is bound to the origin and connection.
  Requests that arrive within two seconds, expire after 30 minutes, have
  forged signatures, or reuse a challenge from another IP are rejected.
- A database unique constraint enforces one note per connection per UTC day,
  including concurrent requests. Retrying the same successful request is safe.
- Bounded requests, field limits and http(s)-only URL validation run server-side.
- HTML/link promotion in message/name text is held privately for review.
- Messages render as text, never user-controlled HTML. Links use `ugc nofollow`.
- Email is optional and excluded from every public response. Raw IP addresses
  are never stored; a daily salted hash is used for the submission limit.

No automatic filter guarantees zero spam. In `/admin/`, choose **Guestbook**
to review held notes, approve them, hide spam, or restore a hidden note. These
actions use the existing admin session and CSRF protection. They do not delete
entries. Existing JSON entries still use the manual editing workflow above.

Before deployment, verify the intended Cloudflare account with `wrangler whoami`,
apply **only** `migrations/0001_guestbook.sql` to the existing D1 database,
and confirm the existing `IP_HASH_SECRET` is configured. Never place secrets
in source. The Worker refuses new submissions if signing is not configured.

For a disposable loopback preview, build the site, run `bun scripts/admin-dev.mjs`
on port 8084 and `bun scripts/guestbook-dev.mjs` on port 8793. The latter uses
in-memory SQLite and temporary signing keys, not production data or credentials.

---

## Finding new illustrations

See `docs/notecard-sources.md` for vetted CC0/Public Domain sources
(Rawpixel, Smithsonian, The Met, etc.) and preparation guidelines.

---

## Asset hygiene

Only `notecard-<slug>.webp` and `README.md` are allowed in
`assets/images/notecards/`. The smoke test (`bun run check:smoke`)
fails if stray files (JPG, PNG, etc.) are present. Keep raw sources in
`scratch/notecard-sources/` (gitignored).

---

## Quick-reference cheat sheet

| Task           | Commands                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------- |
| Add theme      | `bun run add-notecard <file> <slug>`, `python3 scripts/notecard_luminance.py`, `bun run build` |
| Remove theme   | `rm assets/images/notecards/notecard-<slug>.webp`, `bun run build`                             |
| Change default | Edit `DEFAULT_KEY` in `src/_data/notecardThemes.js`, `bun run build`                           |
| Add entry      | Edit `src/_data/guestbook.json`, `bun run build`                                               |
| Validate       | `bun run build:prod && bun run check:smoke`                                                    |
