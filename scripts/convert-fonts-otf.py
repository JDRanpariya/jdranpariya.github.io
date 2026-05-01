"""Convert variable WOFF2 fonts to static OTF for resvg/satori compatibility."""
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
import os

FONTS_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "fonts")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "fonts", "og-static")
os.makedirs(OUT_DIR, exist_ok=True)

conversions = [
    ("fraunces-latin-wght-normal.woff2", "Fraunces-Bold.otf", {"wght": 700}),
    ("literata-latin-wght-normal.woff2", "Literata-Regular.otf", {"wght": 400}),
    ("literata-latin-wght-normal.woff2", "Literata-Medium.otf", {"wght": 500}),
]

for src_name, dst_name, axes in conversions:
    src_path = os.path.join(FONTS_DIR, src_name)
    dst_path = os.path.join(OUT_DIR, dst_name)
    
    font = TTFont(src_path)
    instantiateVariableFont(font, axes, inplace=True)
    font.flavor = None  # Output as OTF
    font.save(dst_path)
    font.close()
    print(f"  → {dst_name} ({os.path.getsize(dst_path)} bytes)")

print(f"\nDone. Static fonts in {OUT_DIR}")
