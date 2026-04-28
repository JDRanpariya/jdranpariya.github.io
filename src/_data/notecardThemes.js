// src/_data/notecardThemes.js
//
// Build-time scan of assets/images/notecards/. Each
//   notecard-<id>.webp
// becomes a theme; <id> is the theme key. Everything is image-kind —
// ornament themes were retired (Apr 2026).
//
// Output shape:
//
//   {
//     themes: [
//       { key: "paper", kind: "image", src: "/assets/images/notecards/notecard-paper.webp", label: "Paper" },
//       { key: "cream", kind: "image", src: "/assets/images/notecards/notecard-cream.webp", label: "Cream" },
//       ...
//     ],
//     keys: ["paper", "cream", ...]
//   }
//
// Order: DEFAULT_KEY (if present on disk) is hoisted to index 0 so it's
// the composer's initial theme and the fallback for unknown entry keys.
// Everything else follows alphabetical-by-slug for a deterministic picker.
//
// Consumed by:
//   - src/guestbook.njk       (renders picker + hidden field + notecards)
//   - assets/js/guestbook.js  (reads window.NOTECARD_THEMES to cycle)
//
// Drop a new webp in assets/images/notecards/ and rebuild. No code
// changes needed. Change DEFAULT_KEY below to swap the default.

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const NOTECARD_DIR = "assets/images/notecards";
const FILE_RE = /^notecard-([a-z0-9][a-z0-9-]*)\.webp$/i;

// Initial theme on the composer and fallback for unknown entry keys.
// Must match a notecard-<slug>.webp on disk; if missing, we fall back to
// the first alphabetical theme (previous behaviour).
const DEFAULT_KEY = "beige";

function scanImageThemes() {
  let entries;
  try {
    entries = readdirSync(NOTECARD_DIR);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }

  const themes = [];
  for (const name of entries) {
    const match = FILE_RE.exec(name);
    if (!match) continue;

    const full = join(NOTECARD_DIR, name);
    const st = statSync(full);
    if (!st.isFile() || st.size === 0) continue;

    const key = match[1].toLowerCase();
    themes.push({
      key,
      kind: "image",
      src: "/" + full.replace(/\\/g, "/"),
      label: key
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
    });
  }

  // Stable alphabetical order so the picker is deterministic regardless
  // of the OS's readdir order, then hoist DEFAULT_KEY to index 0 if it
  // exists on disk. Guestbook UI uses themes[0] as the composer default
  // and the fallback for unknown entry keys.
  themes.sort((a, b) => a.key.localeCompare(b.key));
  const defaultIdx = themes.findIndex((t) => t.key === DEFAULT_KEY);
  if (defaultIdx > 0) {
    const [def] = themes.splice(defaultIdx, 1);
    themes.unshift(def);
  }
  return themes;
}

export default (function build() {
  const themes = scanImageThemes();
  return {
    themes,
    keys: themes.map((t) => t.key),
  };
})();
