#!/usr/bin/env python3
"""Compute mean luminance of each notecard-*.webp.

Decides which themes need a light (cream) ink override vs. the default
sepia. Uses dwebp -> PPM -> pure-python pixel loop (no PIL needed).

Output columns: slug, mean RGB, mean luminance (0-255), warmth, class.
Class thresholds follow the rule noted in input.css:
  lum >= 180 and warm/neutral -> default sepia ink is fine
  lum 120-180 or saturated    -> borderline, test both inks
  lum <  120                  -> use cream ink
"""
import re
import subprocess
import tempfile
from pathlib import Path

_HDR = re.compile(
    rb'^(P6)\s+(?:#[^\n]*\n\s*)*(\d+)\s+(?:#[^\n]*\n\s*)*(\d+)\s+(?:#[^\n]*\n\s*)*(\d+)\s',
    re.DOTALL,
)

def read_ppm_mean(ppm_path):
    """Parse a binary PPM (P6) and compute mean RGB across all pixels.

    The PPM spec allows:
      P6\\n<W> <H>\\n<MAXVAL>\\n<raw bytes...>
    Comments (   ) and arbitrary whitespace between header fields.
    One single whitespace separates the maxval from the raw pixel data.
    """
    data = Path(ppm_path).read_bytes()
    m = _HDR.match(data)
    if not m:
        raise ValueError(f'not a P6 PPM: header starts {data[:32]!r}')
    magic, w, h, maxval = m.group(1).decode(), int(m.group(2)), int(m.group(3)), int(m.group(4))
    if magic != 'P6' or maxval != 255:
        raise ValueError(f'unsupported PPM: {magic} maxval={maxval}')
    body_start = m.end()
    expected_body = w * h * 3
    body = data[body_start:body_start + expected_body]
    if len(body) != expected_body:
        raise ValueError(
            f'PPM body size mismatch for {ppm_path}: got {len(body)}, '
            f'expected {expected_body} ({w}x{h}x3)'
        )
    # Aggregate in pure python — 840x576 = ~484k pixels, completes in <1s.
    total_r = sum(body[0::3])
    total_g = sum(body[1::3])
    total_b = sum(body[2::3])
    count = w * h
    return total_r / count, total_g / count, total_b / count, w, h


def classify(lum, r, b):
    warmth = 'warm' if r > b + 10 else ('cool' if b > r + 10 else 'neutral')
    if lum < 120:
        cls = 'DARK  -> cream ink'
    elif lum < 170:
        cls = 'MID   -> test both'
    else:
        cls = 'LIGHT -> sepia OK'
    return warmth, cls


def main():
    webps = sorted(Path('assets/images/notecards').glob('notecard-*.webp'))
    print(f'{"slug":30s}  {"R":>6s} {"G":>6s} {"B":>6s}  {"lum":>6s}  {"size":>9s}  {"warmth":7s}  class')
    print('-' * 100)
    for webp in webps:
        with tempfile.NamedTemporaryFile(suffix='.ppm', delete=False) as tmp:
            ppm = tmp.name
        try:
            subprocess.run(
                ['dwebp', str(webp), '-ppm', '-o', ppm],
                check=True, capture_output=True,
            )
            r, g, b, w, h = read_ppm_mean(ppm)
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            warmth, cls = classify(lum, r, b)
            slug = webp.stem.removeprefix('notecard-')
            print(
                f'{slug:30s}  {r:6.1f} {g:6.1f} {b:6.1f}  {lum:6.1f}  '
                f'{w}x{h:<4d}  {warmth:7s}  {cls}'
            )
        finally:
            Path(ppm).unlink(missing_ok=True)


if __name__ == '__main__':
    main()
