#!/usr/bin/env bash
# scripts/add-notecard.sh — prep a raw image into a notecard.
#
# Usage:
#   ./scripts/add-notecard.sh <source> <slug>
#
# Example:
#   ./scripts/add-notecard.sh ~/Downloads/v709-katie.jpg pink-floral
#
# Tip: keep source files (raw JPGs/PNGs) out of assets/images/notecards/
# so they don't ship to the site. A good convention is to put them in
# scratch/notecard-sources/ which is gitignored.
#
# Does:
#   1. Resizes source to 840px wide (2x retina, aspect preserved)
#   2. Converts to WebP at quality 85
#   3. Names it notecard-<slug>.webp
#   4. Drops it in assets/images/notecards/
#   5. Reports file size and warns if > 50 KB
#
# Requires: cwebp (brew install webp)

set -euo pipefail

SOURCE="${1:-}"
SLUG="${2:-}"

if [[ -z "$SOURCE" || -z "$SLUG" ]]; then
  echo "Usage: $0 <source-image> <slug>" >&2
  echo "Example: $0 ~/Downloads/flowers.jpg pink-floral" >&2
  exit 1
fi

if [[ ! -f "$SOURCE" ]]; then
  echo "Source file not found: $SOURCE" >&2
  exit 1
fi

# Validate slug: kebab-case, lowercase alphanumeric + hyphen, 2-30 chars
if ! [[ "$SLUG" =~ ^[a-z0-9]([a-z0-9-]{0,28}[a-z0-9])?$ ]]; then
  echo "Slug must be lowercase kebab-case, 2-30 chars. Got: $SLUG" >&2
  echo "Good examples: pink-floral, moth, katie, brush-flowers" >&2
  exit 1
fi

if ! command -v cwebp >/dev/null 2>&1; then
  echo "cwebp not found. Install with: brew install webp" >&2
  exit 1
fi

OUTDIR="assets/images/notecards"
OUT="$OUTDIR/notecard-${SLUG}.webp"

mkdir -p "$OUTDIR"

if [[ -f "$OUT" ]]; then
  echo "File exists: $OUT" >&2
  echo "Pick a different slug or rm the existing file first." >&2
  exit 1
fi

echo "Processing $SOURCE → $OUT"
# -resize 840 0 = 840px wide, auto height (preserves aspect ratio)
# -q 85 = quality 85 (sweet spot for illustrated content)
# -mt = multi-threaded
cwebp -q 85 -resize 840 0 -mt -quiet "$SOURCE" -o "$OUT"

BYTES=$(wc -c < "$OUT" | tr -d ' ')
KB=$((BYTES / 1024))

echo "  → $OUT ($KB KB)"

if (( KB > 80 )); then
  echo
  echo "⚠  File is $KB KB, target is < 50 KB (hard max 80 KB)." >&2
  echo "   Try lowering quality: edit this script and use -q 75 instead of -q 85." >&2
  echo "   Or pre-crop the source to a tighter composition." >&2
elif (( KB > 50 )); then
  echo "  (slightly over 50 KB — fine, but keep an eye on cumulative page weight.)"
fi

echo
echo "Rebuild the site to pick up the new card:"
echo "  bun run build"
