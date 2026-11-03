"""Regression checks for the social-card renderer (no browser required)."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageFont

spec = importlib.util.spec_from_file_location("og_images", Path(__file__).with_name("generate-og-images.py"))
og = importlib.util.module_from_spec(spec)
spec.loader.exec_module(og)


class SocialCardsTest(unittest.TestCase):
    def test_uses_rendered_multiline_and_escaped_metadata(self):
        parsed = og.PageMetadata('<meta property="og:title"\n content="Jay&#39;s &quot;ideas&quot; &amp; tools">')
        self.assertEqual(parsed.meta["og:title"], 'Jay\'s "ideas" & tools')

    def test_long_unbroken_words_stay_inside_card_width(self):
        font = ImageFont.truetype(og.static_font("figtree-latin-wght-normal.woff2", 700), 64)
        lines = og.wrap_text("verylongword" * 30, font, 1040)
        self.assertGreater(len(lines), 1)
        self.assertTrue(all(font.getlength(line) <= 1040 for line in lines))
        self.assertEqual("".join(lines), "verylongword" * 30)

    def test_long_titles_have_safe_glyph_bounds_and_correct_dimensions(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "long-title.png"
            bounds = og.render_card({
                "og:title": "Learning Contact Representations from Zero-Cost Proprioceptive Effort Signals for Contact-Rich Visuomotor Imitation Learning",
                "og:url": "https://research.jdranpariya.com/publications/",
                "og:description": "Manuscripts and writing samples.",
            }, output)
            with Image.open(output) as image:
                self.assertEqual(image.size, (1200, 630))
            self.assertTrue(all(60 <= left < right <= 1140 and 40 <= top < bottom <= 595
                                for left, top, right, bottom in bounds))


if __name__ == "__main__":
    unittest.main()
