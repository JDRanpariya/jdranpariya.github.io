// src/_data/notecardStamps.js
//
// Build-time scan of assets/images/stamps/. Each
//   stamp-<slug>.png
// becomes a corner illustration for posted guestbook notes.
//
// Output: array of src paths, e.g.
//   ["/assets/images/stamps/stamp-peony.png", ...]
//
// Consumed by src/guestbook.njk — each posted note gets one stamp
// assigned deterministically via loop.index0 % stamps.length.
//
// Drop a new PNG in assets/images/stamps/ and rebuild. No code
// changes needed.

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const STAMP_DIR = "assets/images/stamps";
const FILE_RE = /^stamp-([a-z0-9][a-z0-9-]*)\.png$/i;

function scanStamps() {
  let entries;
  try {
    entries = readdirSync(STAMP_DIR);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }

  const stamps = [];
  for (const name of entries) {
    const match = FILE_RE.exec(name);
    if (!match) continue;
    const full = join(STAMP_DIR, name);
    const st = statSync(full);
    if (!st.isFile() || st.size === 0) continue;
    stamps.push("/" + full.replace(/\\/g, "/"));
  }
  return stamps.sort();
}

export default scanStamps();
