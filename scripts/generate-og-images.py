"""
scripts/generate-og-images.py

Generates Open Graph social preview images (1200×630).
Uses Pillow + fontTools for text rendering with self-hosted fonts.
No browser, no Node native addons, 100% reliable.

Requires: Pillow, fontTools (already installed)
Run: python3 scripts/generate-og-images.py
"""

import os
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import textwrap

# ─── Paths ────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
FONTS_DIR = ASSETS / "fonts" / "og-static"  # static OTF files
OG_DIR = ASSETS / "og"
SRC_WRITINGS = ROOT / "src" / "writings"
SRC_LIBRARY_BOOKS = ROOT / "src" / "library" / "books"
SRC_LIBRARY_PAPERS = ROOT / "src" / "library" / "papers"
SRC_LIBRARY_LECTURES = ROOT / "src" / "library" / "lectures"

CARD_W = 1200
CARD_H = 630

# Design tokens (from src/css/input.css)
BG = "#fdfbf5"
INK = "#2c251d"
INK_MUTED = "#786a55"
INK_FAINT = "#b8ad91"
ACCENT = "#9b4230"

# ─── Fonts ────────────────────────────────────────────────────────────────────
FONT_FRAUNCES_BOLD = str(FONTS_DIR / "Fraunces-Bold.otf")
FONT_LITERATA_REGULAR = str(FONTS_DIR / "Literata-Regular.otf")
FONT_LITERATA_MEDIUM = str(FONTS_DIR / "Literata-Medium.otf")

# ─── Title Case ───────────────────────────────────────────────────────────────
SMALL_WORDS = {
    "a", "an", "and", "as", "at", "but", "by", "for", "in",
    "nor", "of", "on", "or", "so", "the", "to", "up", "yet",
    "with", "vs", "via",
}

def smart_title_case(s):
    """Port of .eleventy.js smartTitleCase filter."""
    if not s:
        return ""
    import re
    tokens = re.split(r'(\s+)', str(s))
    word_indices = [i for i, t in enumerate(tokens) if re.search(r'\S', t)]
    first_idx = word_indices[0] if word_indices else 0
    last_idx = word_indices[-1] if word_indices else 0

    result = []
    for i, token in enumerate(tokens):
        if not re.search(r'\S', token):
            result.append(token)
            continue
        # Preserve all-caps tokens (AI, UNIX, RL, JAX)
        if re.match(r'^[A-Z0-9]{2,}$', token):
            result.append(token)
            continue
        lower = token.lower()
        bare = re.sub(r'[^a-z]', '', lower)
        if i != first_idx and i != last_idx and bare in SMALL_WORDS:
            result.append(lower)
        else:
            result.append(re.sub(r'([a-z])', lambda c: c.group(1).upper(), lower, count=1))
    return ''.join(result)


# ─── Text wrapping ────────────────────────────────────────────────────────────
def wrap_text(text, font, max_width, draw):
    """Wrap text to fit within max_width pixels."""
    words = text.split(' ')
    lines = []
    current = ''
    for word in words:
        test = f"{current} {word}".strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] > max_width and current:
            lines.append(current)
            current = word
        else:
            current = test
    if current:
        lines.append(current)
    return lines


# ─── Card rendering ───────────────────────────────────────────────────────────
def title_font_size(title):
    if len(title) > 48:
        return 44
    if len(title) > 36:
        return 50
    return 56


def render_card(title, output_path, is_default=False):
    """Render a single OG card."""
    img = Image.new('RGBA', (CARD_W, CARD_H), BG)
    draw = ImageDraw.Draw(img)

    display_title = "JD Ranpariya" if is_default else title
    show_rule = not is_default
    tagline = "Physical AI Researcher & Builder" if is_default else None

    # Title
    size = 64 if is_default else title_font_size(display_title)
    title_font = ImageFont.truetype(FONT_FRAUNCES_BOLD, size=size)
    max_width = 1040

    lines = wrap_text(display_title, title_font, max_width, draw)
    line_height = int(size * 1.25)

    # Calculate vertical centering
    title_total_h = len(lines) * line_height
    if is_default:
        title_start_y = (CARD_H - title_total_h - 140) // 2
    else:
        title_start_y = (CARD_H - title_total_h - 150) // 2

    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=title_font)
        text_w = bbox[2] - bbox[0]
        x = (CARD_W - text_w) // 2
        y = title_start_y + i * line_height
        draw.text((x, y), line, fill=INK, font=title_font)

    # Terracotta rule
    rule_y = title_start_y + title_total_h + 40
    if show_rule:
        rule_x = (CARD_W - 180) // 2
        draw.rectangle([rule_x, rule_y, rule_x + 180, rule_y + 2], fill=ACCENT)

    # Tagline (default card)
    if tagline:
        tag_font = ImageFont.truetype(FONT_LITERATA_REGULAR, size=26)
        tag_y = rule_y + 50 if not show_rule else rule_y + 50
        bbox = draw.textbbox((0, 0), tagline, font=tag_font)
        tag_w = bbox[2] - bbox[0]
        draw.text(((CARD_W - tag_w) // 2, tag_y), tagline, fill=INK_MUTED, font=tag_font)

    # Author
    author_font = ImageFont.truetype(FONT_LITERATA_MEDIUM, size=24)
    author_text = "JD Ranpariya"
    bbox = draw.textbbox((0, 0), author_text, font=author_font)
    author_w = bbox[2] - bbox[0]
    author_y = CARD_H - 60
    draw.text(((CARD_W - author_w) // 2, author_y), author_text, fill=INK_MUTED, font=author_font)

    # URL
    url_font = ImageFont.truetype(FONT_LITERATA_REGULAR, size=18)
    url_text = "jdranpariya.github.io"
    bbox = draw.textbbox((0, 0), url_text, font=url_font)
    url_w = bbox[2] - bbox[0]
    url_y = author_y - 28
    draw.text(((CARD_W - url_w) // 2, url_y), url_text, fill=INK_FAINT, font=url_font)

    # Save
    img.save(output_path, format='PNG', optimize=True)


# ─── Page discovery ───────────────────────────────────────────────────────────
def parse_frontmatter(text):
    """Minimal YAML frontmatter parser."""
    if not text.startswith('---'):
        return {}
    end = text.index('---', 3)
    fm = text[3:end]
    result = {}
    for line in fm.split('\n'):
        m = __import__('re').match(r'^(\w[\w-]*):\s*(.*)', line)
        if m:
            val = m.group(2).strip()
            # Strip inline YAML comments
            val = __import__('re').sub(r'\s+#.*$', '', val)
            if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                val = val[1:-1]
            result[m.group(1)] = val
    return result


def discover_pages():
    pages = []

    for src_dir, prefix, file_prefix in [
        (SRC_WRITINGS, "", ""),
        (SRC_LIBRARY_BOOKS, "library/books/", "book-"),
        (SRC_LIBRARY_PAPERS, "library/papers/", "paper-"),
        (SRC_LIBRARY_LECTURES, "library/lectures/", "lecture-"),
    ]:
        if not src_dir.exists():
            continue
        section_type = src_dir.parent.name if prefix else "writing"
        for f in sorted(src_dir.glob('*.md')):
            text = f.read_text(encoding='utf-8')
            fm = parse_frontmatter(text)
            if fm.get('status') == 'draft':
                continue
            slug = f.stem
            raw_title = fm.get('title', slug)
            display_title = smart_title_case(raw_title)
            pages.append({
                'type': section_type,
                'slug': f"{prefix}{slug}",
                'title': display_title,
                'filename': f"{file_prefix}{slug}.png",
            })

    return pages


def render_guestbook_card(output_path):
    """Special card for the guestbook page with tagline."""
    img = Image.new('RGBA', (CARD_W, CARD_H), BG)
    draw = ImageDraw.Draw(img)

    title = "Guest Book"
    title_font = ImageFont.truetype(FONT_FRAUNCES_BOLD, size=64)
    bbox = draw.textbbox((0, 0), title, font=title_font)
    tw = bbox[2] - bbox[0]
    title_y = 230
    draw.text(((CARD_W - tw) // 2, title_y), title, fill=INK, font=title_font)

    # Rule
    rule_y = int(title_y + 64 * 1.25) + 40
    draw.rectangle([(CARD_W - 180) // 2, rule_y, (CARD_W - 180) // 2 + 180, rule_y + 2], fill=ACCENT)

    # Tagline
    tag_font = ImageFont.truetype(FONT_LITERATA_REGULAR, size=26)
    tagline = "Notes from friends & strangers"
    bbox = draw.textbbox((0, 0), tagline, font=tag_font)
    tw2 = bbox[2] - bbox[0]
    draw.text(((CARD_W - tw2) // 2, rule_y + 50), tagline, fill=INK_MUTED, font=tag_font)

    # Author
    author_font = ImageFont.truetype(FONT_LITERATA_MEDIUM, size=24)
    author = "JD Ranpariya"
    bbox = draw.textbbox((0, 0), author, font=author_font)
    aw = bbox[2] - bbox[0]
    draw.text(((CARD_W - aw) // 2, CARD_H - 60), author, fill=INK_MUTED, font=author_font)

    # URL
    url_font = ImageFont.truetype(FONT_LITERATA_REGULAR, size=18)
    url = "jdranpariya.github.io"
    bbox = draw.textbbox((0, 0), url, font=url_font)
    uw = bbox[2] - bbox[0]
    draw.text(((CARD_W - uw) // 2, CARD_H - 60 - 28), url, fill=INK_FAINT, font=url_font)

    img.save(output_path, format='PNG', optimize=True)


# ─── Main ────────────────────────────────────────────────────────────────────
def main():
    OG_DIR.mkdir(parents=True, exist_ok=True)

    print("Discovering pages...")
    pages = discover_pages()

    # 1. Default site-wide card
    print("Generating default card...")
    render_card("", OG_DIR / "default.png", is_default=True)
    print("  → assets/og/default.png")

    # 1b. Guestbook card
    print("Generating guestbook card...")
    render_guestbook_card(OG_DIR / "guestbook.png")
    print("  → assets/og/guestbook.png")

    # 2. Per-article cards
    count = 0
    for page in pages:
        print(f"  [{page['type']}] {page['title']} ... ", end="", flush=True)
        try:
            render_card(page['title'], OG_DIR / page['filename'])
            print("✓")
            count += 1
        except Exception as e:
            print(f"✗ {e}")

    print(f"\nDone. {count} cards + 1 default → assets/og/")


if __name__ == '__main__':
    main()
