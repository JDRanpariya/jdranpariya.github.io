import { test, expect } from "bun:test";
import MarkdownIt from "markdown-it";
import { galleryMarkdown, photoGallery } from "./photo-gallery.mjs";
import { renderDocument } from "./admin-renderer.mjs";
import { noteHtml } from "../apps/research/lib/note-authoring.mjs";
import { galleryItems, galleryBlockAtCursor } from "./gallery-data.mjs";
import { parseResearchHome } from "../apps/research/lib/research-home.ts";

const photo = (alt, caption = "") => ({ src: "/assets/images/uploads/test.jpg", alt, caption });
test("gallery blocks can be absent, single, multiple and repeated without leaking state", () => {
  const md = new MarkdownIt().use(photoGallery);
  expect(md.render("A paragraph.")).not.toContain("photo-gallery");
  const one = galleryMarkdown([photo("The river", "Salzburg")]);
  const many = galleryMarkdown([photo("First"), photo("Second")]);
  const rendered = md.render(`Before\n${one}Between\n${many}After`);
  expect(rendered.match(/class="photo-gallery"/g)).toHaveLength(2);
  expect(rendered.match(/class="photo-figure"/g)).toHaveLength(3);
  expect(rendered).toContain("<figcaption>Salzburg</figcaption>");
  expect(rendered).toContain('aria-label="Photo gallery, 2 photos" tabindex="0"');
  expect(rendered).toContain('role="group" aria-label="Photograph"');
  expect(rendered.match(/<figcaption>/g)).toHaveLength(1);
  expect(rendered).not.toContain("<p><figure");
  expect(md.render("![Normal](/photo.jpg)")).not.toContain("photo-figure");
  expect(renderDocument(one + many, "src/notes/test.md").bodyHtml).toContain("photo-gallery");
  expect(noteHtml(one, { path: "apps/research/content/test.md" })).toContain("photo-gallery");
});
test("photo markup escapes captions and validates paths and descriptions", () => {
  const md = new MarkdownIt().use(photoGallery);
  expect(md.render(galleryMarkdown([photo('A ] " view', "<script>alert(1)</script>")]))).toContain(
    "&lt;script&gt;"
  );
  expect(() => galleryMarkdown([])).toThrow();
  expect(() => galleryMarkdown([photo("")])).toThrow();
  expect(() => galleryMarkdown([{ src: "javascript:alert(1)", alt: "Unsafe" }])).toThrow();
  expect(() =>
    galleryMarkdown([{ src: "/assets/images/../private.jpg", alt: "Unsafe" }])
  ).toThrow();
});

test("gallery edits round-trip metadata and research home preserves quotes and blocks", () => {
  const photos = [photo('A ] " view', 'Caption " here'), photo("River")],
    block = galleryMarkdown(photos);
  expect(galleryItems(block)).toEqual(photos);
  const source = `Before\n${block}After`,
    found = galleryBlockAtCursor(source, source.indexOf("Caption"));
  expect(found.items).toEqual(photos);
  expect(source.slice(0, found.start) + source.slice(found.end)).toContain("After");
  expect(galleryBlockAtCursor(source, 0)).toBeNull();
  const home = parseResearchHome(
    `# Test\n\nIntroduction\n${block}\n> Quote\n> — Simon\n\n## Learning {#learning}\nQuestion\n${block}`
  );
  expect(home.quote).toEqual({ text: "Quote", attribution: "Simon" });
  expect(home.introduction).toContain(block.trim());
  expect(home.themes[0].questions).toContain("::: gallery");
});
