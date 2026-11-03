"""Generate social cards from rendered HTML, not a second frontmatter parser.

Run after Eleventy: python3 scripts/generate-og-images.py [--input build] [--research].
The research homepage's authored screenshot is passed through, never re-rendered.
All image dimensions, glyph bounds and duplicate output mappings are validated.
"""

import argparse
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
SITE = json.loads((ROOT / "src/_data/site.json").read_text())
WIDTH, HEIGHT = SITE["image"]["width"], SITE["image"]["height"]
BG, INK, MUTED, ACCENT = "#ffffff", "#121212", "#686764", "#b8321c"


class PageMetadata(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.meta = {}
        self.feed(html)

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        if tag == "meta":
            key = attributes.get("property", attributes.get("name"))
            if key:
                self.meta[key] = attributes.get("content", "")


def static_font(filename, weight):
    """Use the actual webfonts; no stale, separately maintained font binaries."""
    source = ROOT / "assets/fonts" / filename
    digest = hashlib.sha256(source.read_bytes()).hexdigest()[:12]
    output = ROOT / ".cache/og-fonts" / f"{source.stem}-{weight}-{digest}.ttf"
    if not output.exists():
        output.parent.mkdir(parents=True, exist_ok=True)
        font = TTFont(source)
        instantiateVariableFont(font, {"wght": weight}, inplace=True)
        font.flavor = None
        font.save(output)
        font.close()
    return str(output)


def wrap_text(text, font, maximum_width):
    """Wrap by measured glyph width, including a single overlong URL/word."""
    lines, current = [], ""
    for word in str(text).split():
        candidate = f"{current} {word}".strip()
        if font.getlength(candidate) <= maximum_width:
            current = candidate
            continue
        if current:
            lines.append(current)
            current = ""
        for character in word:
            if current and font.getlength(current + character) > maximum_width:
                lines.append(current)
                current = ""
            current += character
    if current:
        lines.append(current)
    return lines


def render_card(meta, output):
    heading = static_font("figtree-latin-wght-normal.woff2", 700)
    body = static_font("source-serif-4-latin-wght-normal.woff2", 400)
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    title = meta["og:title"].removesuffix(f" · {SITE['name']}")
    for size in range(68, 27, -2):
        title_font = ImageFont.truetype(heading, size)
        lines = wrap_text(title, title_font, WIDTH - 160)
        line_height = round(size * 1.22)
        if len(lines) * line_height <= 260:
            break
    else:
        raise ValueError(f"Title cannot fit a social card: {title}")
    title_height = len(lines) * line_height
    top = 95 + (260 - title_height) / 2
    bounds = []

    def text(line, font, y, colour):
        # 'mt' anchors the visible glyph top, rather than the baseline/ascender.
        position = (WIDTH / 2, y)
        box = draw.textbbox(position, line, font=font, anchor="mt")
        if not (60 <= box[0] <= box[2] <= WIDTH - 60 and 40 <= box[1] <= box[3] <= HEIGHT - 35):
            raise ValueError(f"Text outside safe bounds: {line!r}, {box}")
        bounds.append(box)
        draw.text(position, line, font=font, fill=colour, anchor="mt")

    for index, line in enumerate(lines):
        text(line, title_font, top + index * line_height, INK)
    rule_y = top + title_height + 24
    draw.rectangle((WIDTH / 2 - 90, rule_y, WIDTH / 2 + 90, rule_y + 2), fill=ACCENT)
    # The homepage is an identity card; article cards keep the focus on the title.
    if urlparse(meta["og:url"]).path in ("", "/"):
        font = ImageFont.truetype(body, 26)
        description_lines = wrap_text(meta["og:description"], font, WIDTH - 240)
        if len(description_lines) > 3:
            raise ValueError("Homepage description exceeds the card's three-line space")
        for index, line in enumerate(description_lines):
            text(line, font, rule_y + 28 + index * 34, MUTED)
    if title != SITE["name"]:
        text(SITE["name"], ImageFont.truetype(body, 24), 525, MUTED)
    text(urlparse(meta["og:url"]).netloc, ImageFont.truetype(body, 20), 565, MUTED)
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, format="PNG", optimize=True)
    return bounds


def generate(directory, research=False):
    directory = directory.resolve()
    origin = SITE["research"]["url"] if research else SITE["url"]
    records, mapped = [], {}
    for html_file in sorted(directory.rglob("*.html")):
        meta = PageMetadata(html_file.read_text(encoding="utf-8")).meta
        if "og:site_name" not in meta:
            continue  # Auth shells, sandbox previews, redirects, and demos.
        required = ("og:title", "og:description", "og:url", "og:image", "og:image:alt")
        if any(not meta.get(key, "").strip() for key in required):
            raise ValueError(f"Missing social metadata: {html_file}")
        image_url = urlparse(meta["og:image"])
        if image_url.netloc != urlparse(origin).netloc:
            raise ValueError(f"Cross-site social image: {html_file}: {meta['og:image']}")
        image_path = unquote(image_url.path)
        if not image_path.startswith("/assets/og/"):
            raise ValueError(f"Unexpected social image path: {image_path}")
        output = (directory / image_path.lstrip("/")).resolve()
        if not output.is_relative_to(directory / "assets/og"):
            raise ValueError(f"Unsafe social image path: {image_path}")
        signature = tuple(meta[key] for key in required)
        if output in mapped and mapped[output] != signature:
            raise ValueError(f"Different pages overwrite the same thumbnail: {image_path}")
        mapped[output] = signature
        screenshot = research and image_path == SITE["research"]["image"]
        bounds = [] if screenshot else render_card(meta, output)
        with Image.open(output) as image:
            if image.size != (WIDTH, HEIGHT):
                raise ValueError(f"Wrong social image dimensions: {output}: {image.size}")
            image.verify()
        if output.stat().st_size > 1_000_000:
            raise ValueError(f"Social image exceeds 1 MB: {output}")
        records.append({
            "page": meta["og:url"], "title": meta["og:title"],
            "image": meta["og:image"], "bytes": output.stat().st_size,
            "screenshot": screenshot, "textBounds": bounds,
        })
    if not records:
        raise ValueError(f"No public social previews found under {directory}")
    audit = directory / "assets/og/audit.json"
    audit.parent.mkdir(parents=True, exist_ok=True)
    audit.write_text(json.dumps(records, indent=2) + "\n")
    print(f"Verified {len(records)} public previews ({len(mapped)} unique images) in {directory}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=ROOT / "build")
    parser.add_argument("--research", action="store_true")
    args = parser.parse_args()
    generate(args.input, research=args.research)
