# Where to find notecard illustrations

Licence rule: **only Public Domain / CC0 / purchased-for-commercial-use
sources**. Everything below is safe to use on this site without
attribution or licence drama. If you find a source not on this list,
verify the licence is CC0 or PDM (Public Domain Mark) before using it.

## Best free sources (in order of usefulness)

### 1. Rawpixel — CC0 collections

<https://www.rawpixel.com/free-public-domain-cc0-images>

- Huge library of high-res vintage illustrations, botanicals, postcards,
  letterpress ornaments, Japanese prints, etc. All tagged CC0.
- Search "vintage flower", "botanical", "postage stamp", "ornament",
  "postcard", "ephemera".
- Download the largest size available, then resize/convert (see below).

### 2. Public Domain Review — archive selections

<https://publicdomainreview.org/collections/>

- Curated oddities: vintage diagrams, celestial maps, moths and insects,
  early postcards, old typographic ornaments.
- Every item on the site is marked with its licence. Check the page;
  most are PDM (equivalent to CC0 for our purposes).

### 3. The Smithsonian Open Access

<https://www.si.edu/openaccess>

- 4M+ CC0 images: natural history specimens (butterflies, moths, shells,
  leaves), fashion plates, decorative objects. Extremely high quality.
- Filter by "CC0" and media type "2D".

### 4. The Met Open Access

<https://www.metmuseum.org/art/collection/search?searchField=All&showOnly=openAccess>

- Fine-art level imagery, CC0. Good for vintage paper, textile prints,
  letterpress plates, calligraphic flourishes.

### 5. Old Book Illustrations

<https://www.oldbookillustrations.com/>

- 19th-century engravings. Per-image licence; many are PD-old. Read the
  licence box on each page before using.

### 6. Internet Archive — Flickr Commons "No known copyright restrictions"

<https://www.flickr.com/commons>

- Library-scanned book plates and archive photographs. Quality varies;
  good for eclectic texture cards.

## Paid-but-worth-it

If you want a consistent illustrated set and want to support an artist,
these sell commercial-use licences (one-time payment, no attribution):

- **Creative Market** — search "watercolor floral clipart", "vintage
  ephemera", "notecard". Usually $10-30 per pack.
- **Design Cuts** bundles — periodic $29 bundles of illustrated assets.
- **Etsy** — many illustrators sell CC0-licensed digital packs.

## What to pick

Look for:

- **Edges-only or corner compositions**: illustration around the border,
  mostly empty in the middle third where your text goes.
- **Soft / desaturated palette**: pastels, muted greens, dusty pinks,
  sepias. Avoid saturated primaries — they fight the reader's eyes.
- **Vintage or hand-drawn feel**: line drawings, watercolor washes,
  botanical plates, old postcards.

Avoid:

- Modern stock vectors (too clean, wrong register)
- Anything with text or writing already on it (conflicts with notes)
- Dark or high-contrast backgrounds (text legibility)
- Copyrighted characters or brand marks

## Preparing files

For each illustration you want to use:

1. **Crop / compose** to a 840x630 canvas (landscape, 4:3 aspect, 2x).
   This matches the on-wall card (420x315 at 1x) so nothing crops.
   Keep the middle third roughly empty so the note text reads.
2. **Export to WebP** at 80-85 quality. Target < 50 KB per file.
3. **Name** it notecard-SLUG.webp and drop in
   assets/images/notecards/.

Convert a PNG/JPG to WebP on the command line:

    cwebp -q 85 input.png -o notecard-moth.webp

Or in bulk for a whole folder:

    for f in *.png; do
      cwebp -q 85 "$f" -o "notecard-${f%.png}.webp"
    done

MacOS: brew install webp if you don't already have cwebp.

## Quick-pick recipe

If you want to stand up 7 cards fast without obsessing over composition:

1. Go to rawpixel.com/search?filter=free-cc0
2. Search "botanical ornament", download 10 candidates at large size.
3. Pick the 7 that feel right together (same era / colour family).
4. Crop each to 840x630 (4:3 landscape, 2x), put the illustration
   around the edges and leave the middle empty for note text.
5. Export webp at q=85, drop in the folder, rebuild.

The picker will find them on next build.
