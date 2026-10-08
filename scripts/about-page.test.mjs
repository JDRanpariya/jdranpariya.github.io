import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import nunjucks from "nunjucks";
import { parseDocument, renderDocument } from "./admin-renderer.mjs";
import { adminInternals } from "../workers/request-intelligence/src/admin.js";

test("About is Markdown-editable and uses the same dedicated public layout", () => {
  const source = readFileSync("src/about.md", "utf8");
  const doc = parseDocument(source);
  expect(adminInternals.safeSourcePath("src/about.md")).toBe("src/about.md");
  expect(doc.frontmatter.permalink).toBe("/about/");
  expect(doc.frontmatter.layout).toBe("layouts/about.njk");
  const result = renderDocument(source, "src/about.md");
  const layout = parseDocument(readFileSync("src/_includes/layouts/about.njk", "utf8")).body;
  const html = nunjucks.renderString(layout, { content: result.bodyHtml });
  expect(html).toContain("Hi, I'm Jay.");
  expect(html.match(/<h1/g)).toHaveLength(1);
  expect(html).toContain("At parties I'm usually");
  expect(html).toContain('href="/guestbook/"');
  expect(html).toContain("Book a call");
  expect(html).not.toContain("post-hero__meta");
});
