import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { App } from "../admin/App.jsx";
import { galleryBlockAtCursor } from "./gallery-data.mjs";
import { GuestbookReview } from "../admin/components/GuestbookReview.jsx";
import "./post-footnotes.test.mjs";
import "./post-index.test.mjs";

test("guestbook moderation is a separate React workspace with reversible actions", () => {
  const html = renderToStaticMarkup(<GuestbookReview api={() => {}} onClose={() => {}} />);
  expect(html).toContain("Guestbook review");
  expect(html).toContain("Back to editor");
  expect(html).toContain("Hiding a note is reversible");
  expect(html).not.toContain("Publish");
});

test("a clean browser with no remembered file can open the React admin", () => {
  expect(() => renderToStaticMarkup(<App />)).not.toThrow();
  expect(renderToStaticMarkup(<App />)).toContain("Opening editor");
});
test("gallery replacement targets one block without modifying surrounding prose", () => {
  const source =
    "Before.\n\n::: gallery\n![View](/assets/images/uploads/view.jpg)\n:::\n\nAfter.\n\n::: gallery\n![Other](/assets/images/uploads/other.jpg)\n:::\n";
  const block = galleryBlockAtCursor(source, source.indexOf("View"));
  const edited = source.slice(0, block.start) + "Replacement\n" + source.slice(block.end);
  expect(edited).toContain("Before.");
  expect(edited).toContain("After.");
  expect(edited).toContain("![Other]");
  expect(edited).not.toContain("![View]");
});
