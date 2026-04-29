# Guestbook Management Guide

Single source of truth for adding, removing, and maintaining notecard
themes and guestbook entries.

---

## File map

| File                            | Role                                      |
| ------------------------------- | ----------------------------------------- |
| `assets/images/notecards/`      | Texture images (the actual cards)         |
| `src/_data/notecardThemes.js`   | Build-time scan; produces the theme list  |
| `src/_data/guestbook.json`      | Manually curated entry data               |
| `src/guestbook.njk`             | Page template (composer + entry cards)    |
| `assets/js/guestbook.js`        | Client-side: theme picker + form submit   |
| `src/css/input.css`             | Notecard styles, per-theme ink overrides  |
| `scripts/add-notecard.sh`       | CLI: JPG/PNG to resized WebP              |
| `scripts/notecard_luminance.py` | Measures texture brightness for ink color |
| `docs/notecard-sources.md`      | Where to find CC0/PD illustrations        |

### Dead code (safe to delete)

| File                                                  | Why                                                |
| ----------------------------------------------------- | -------------------------------------------------- |
| `scripts/build-notecards.py`                          | Old SVG ornament card generator (retired Apr 2026) |
| `scripts/notecard_illustrations.py`                   | SVG motif library for the above                    |
| `scripts/__pycache__/build-notecards.cpython-312.pyc` | Bytecode cache for the above                       |

---

## How it works

1. **WebP files** in `assets/images/notecards/` are the only source of themes.
2. `notecardThemes.js` scans that folder at build time, sorts alphabetically,
   then hoists `DEFAULT_KEY` (currently `"paper"`) to index 0.
3. `guestbook.njk` uses `themes[0]` as the composer's initial theme and as
   fallback for entries whose saved theme no longer exists.
4. `guestbook.js` reads `window.NOTECARD_THEMES` (injected at build) to
   cycle the picker. On submit, the chosen theme key is sent to Google Forms
   via a hidden field (`entry.901424146`).
5. `input.css` sets default ink color (`#5a3a24` sepia) and overrides it
   to cream (`#f0e6d2`) for dark-textured themes via `[data-theme="..."]`
   selectors (wrapped in `/* purgecss start ignore */` comments so they
   survive prod builds).

### Current themes

| Theme  | Luminance   | Ink             | Notes               |
| ------ | ----------- | --------------- | ------------------- |
| paper  | 166 (mid)   | `#5a3a24` sepia | Default on composer |
| cream  | 200 (light) | `#5a3a24` sepia |                     |
| ivory  | 220 (light) | `#5a3a24` sepia |                     |
| indigo | 108 (dark)  | `#f0e6d2` cream | CSS override needed |
| linen  | 72 (dark)   | `#f0e6d2` cream | CSS override needed |

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

The composer form submits to Google Forms via a hidden
`<iframe>`. Google stores responses in a linked spreadsheet.
To publish a new entry, copy it from the spreadsheet into
`guestbook.json` and rebuild. There is no automatic pipeline.

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
