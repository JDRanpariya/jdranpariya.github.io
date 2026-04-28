#!/usr/bin/env python3
"""Generate all 10 notecard WebP files from SVG recipes.

Pipeline per card:
    build SVG (illustration + paper bg + optional grain)
      ↓ write to scratch/notecard-sources/svg/
      ↓ rsvg-convert -w 840 -h 630 → PNG (2x retina)
      ↓ cwebp -q 85 -mt → .webp
      ↓ move to assets/images/notecards/

Run from repo root:
    python3 scripts/build-notecards.py            # all cards
    python3 scripts/build-notecards.py fox dusk   # just these slugs

Environment:
    cwebp  — required (brew install webp)
    rsvg-convert — required (brew install librsvg)

Design tokens live in this file (paper + ink pairs). Illustrations live in
  scripts/notecard_illustrations.py — add a draw_<name>(ink) function
  there, then register it below.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from textwrap import dedent

# Make sibling module importable when run from repo root.
sys.path.insert(0, str(Path(__file__).resolve().parent))
import notecard_illustrations as ill  # noqa: E402

# -------- paths ------------------------------------------------------------
REPO = Path(__file__).resolve().parent.parent
SVG_DIR = REPO / "scratch" / "notecard-sources" / "svg"
PNG_DIR = REPO / "scratch" / "notecard-sources" / "png"
OUT_DIR = REPO / "assets" / "images" / "notecards"

# -------- card canvas ------------------------------------------------------
# 4:3 landscape at 2x retina — matches the on-wall display at 420x315.
W, H = 840, 630

# -------- illustration anchor ---------------------------------------------
# Bottom-left corner, with ~40 px margin. On the card rendered at 420 px
# wide, the illustrations display at ~190 px wide (about 45% of card width
# and 55% of card height). Big enough to be iconically recognizable, small
# enough to leave the message column uninterrupted.
#
# History:
#   v0: anchored at (60, 330) with motifs sized ~230x220 → renders at
#       ~22% of card width; vision check said "blob, unrecognisable".
#   v1 (THIS): anchored at (40, 230) and each motif grown ~70% via a
#       scale(1.7) in build_svg so the new bbox is ~380x370 in SVG
#       coordinates (= ~190 px on a 420 px card).
ART_X = 40
ART_Y = 230
# Multiplied onto every motif's translate group. 1.7 moves from "tasteful
# icon" to "clearly a rocket / clearly a fox" without crowding the text.
ART_SCALE = 1.7

# -------- recipes ----------------------------------------------------------
# Key = filename slug. Each recipe names:
#   paper  — background color
#   ink    — stroke color for motif (inverted on dark papers)
#   motif  — one of the draw_* functions, by short name
#   grain  — True to add subtle paper texture noise
#   accent — (optional) second color, only stamp uses it for postmark
#
# The base keys (album, dusk, night, paper, parchment) are kept so
# existing guestbook entries referencing those themes still render.
RECIPES: dict[str, dict] = {
    # --- ALBUM family (cream/ivory, sepia ink) ---
    "album": {
        "paper": "#f6eedd",
        "ink": "#5a3a24",
        "motif": "stamp",
        "accent": "#8b2e1f",
        "grain": True,
    },
    "album-ivory": {
        "paper": "#faf5ea",
        "ink": "#5a3a24",
        "motif": "pen_inkbottle",
        "grain": True,
    },

    # --- DUSK family (warm rose/peach, warm umber ink) ---
    "dusk": {
        "paper": "#f2d9c8",
        "ink": "#6b3a28",
        "motif": "fox",
        "grain": True,
    },
    "dusk-peach": {
        "paper": "#f5e2cd",
        "ink": "#6b3a28",
        "motif": "swallow",
        "grain": True,
    },

    # --- NIGHT family (dark paper, cream ink) ---
    "night": {
        "paper": "#1e2a3a",
        "ink": "#f0e6d2",
        "motif": "rocket",
        "grain": True,
    },
    "night-charcoal": {
        "paper": "#2a2722",
        "ink": "#e8d9b5",
        "motif": "owl_moon",
        "grain": True,
    },

    # --- PAPER family (workbench/drafting) ---
    "paper": {
        "paper": "#ece1c8",
        "ink": "#4a2e1a",
        "motif": "sextant",
        "grain": True,
    },
    "paper-cool": {
        "paper": "#e9eeec",
        "ink": "#23344e",
        "motif": "pocket_watch",
        "grain": True,
    },

    # --- PARCHMENT family (aged/faded vellum) ---
    "parchment": {
        "paper": "#dec9a0",
        "ink": "#4a2e1a",
        "motif": "compass",
        "grain": True,
    },
    "parchment-faded": {
        "paper": "#ecdcba",
        "ink": "#5a3a24",
        "motif": "hare_wheat",
        "grain": True,
    },
}

# Map short names → callable.
MOTIF_FNS = {
    "fox": ill.draw_fox,
    "compass": ill.draw_compass,
    "rocket": ill.draw_rocket,
    "sextant": ill.draw_sextant,
    "pocket_watch": ill.draw_pocket_watch,
    "owl_moon": ill.draw_owl_moon,
    "swallow": ill.draw_swallow,
    "stamp": ill.draw_stamp,
    "pen_inkbottle": ill.draw_pen_inkbottle,
    "hare_wheat": ill.draw_hare_wheat,
}


def _grain_filter() -> str:
    """SVG filter for subtle paper grain — barely-there noise.

    `baseFrequency` high enough that the pattern doesn't tile visibly.
    `stitchTiles="stitch"` prevents seams at filter-region boundaries.
    opacity 0.08 keeps it near-subliminal so text stays legible.
    """
    return dedent("""\
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" seed="2"/>
          <feColorMatrix values="0 0 0 0 0
                                 0 0 0 0 0
                                 0 0 0 0 0
                                 0 0 0 0.08 0"/>
        </filter>
    """)


def build_svg(recipe: dict) -> str:
    """Compose the full card SVG for one recipe."""
    motif_name = recipe["motif"]
    motif_fn = MOTIF_FNS[motif_name]

    # Stamp is the only motif that takes an accent color.
    if motif_name == "stamp":
        motif_svg = motif_fn(recipe["ink"], recipe.get("accent"))
    else:
        motif_svg = motif_fn(recipe["ink"])

    grain_filter = _grain_filter() if recipe.get("grain") else ""
    grain_overlay = (
        f'<rect width="{W}" height="{H}" filter="url(#grain)" opacity="0.55"/>'
        if recipe.get("grain") else ""
    )

    return dedent(f"""\
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
          <defs>{grain_filter}</defs>
          <!-- paper -->
          <rect width="{W}" height="{H}" fill="{recipe['paper']}"/>
          {grain_overlay}
          <!-- illustration anchored bottom-left -->
          <g transform="translate({ART_X} {ART_Y}) scale({ART_SCALE})">
            {motif_svg}
          </g>
        </svg>
    """)


def run(cmd: list[str]) -> None:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print("COMMAND FAILED:", " ".join(cmd), file=sys.stderr)
        print(r.stderr, file=sys.stderr)
        raise SystemExit(r.returncode)


def build_one(slug: str, recipe: dict) -> None:
    SVG_DIR.mkdir(parents=True, exist_ok=True)
    PNG_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    svg_path = SVG_DIR / f"notecard-{slug}.svg"
    png_path = PNG_DIR / f"notecard-{slug}.png"
    webp_path = OUT_DIR / f"notecard-{slug}.webp"

    # 1. SVG
    svg_path.write_text(build_svg(recipe))

    # 2. SVG → PNG. rsvg-convert writes to stdout unless -o given.
    run(["rsvg-convert", "-w", str(W), "-h", str(H), str(svg_path), "-o", str(png_path)])

    # 3. PNG → WebP. q=85 is the sweet spot for illustrated content
    # (matches scripts/add-notecard.sh). -mt uses multiple threads.
    run(["cwebp", "-q", "85", "-mt", "-quiet", str(png_path), "-o", str(webp_path)])

    size_kb = webp_path.stat().st_size / 1024
    warn = ""
    if size_kb > 80:
        warn = "  FAIL  >80 KB"
    elif size_kb > 50:
        warn = "  warn  >50 KB"
    print(f"  {slug:24s}  {size_kb:5.1f} KB{warn}")


def main() -> None:
    slugs = sys.argv[1:] or list(RECIPES.keys())
    unknown = [s for s in slugs if s not in RECIPES]
    if unknown:
        print(f"unknown slug(s): {unknown}", file=sys.stderr)
        print(f"available: {list(RECIPES)}", file=sys.stderr)
        raise SystemExit(2)

    print(f"Building {len(slugs)} notecard(s):")
    for slug in slugs:
        build_one(slug, RECIPES[slug])
    print("\nOutputs in", OUT_DIR.relative_to(REPO))


if __name__ == "__main__":
    main()
