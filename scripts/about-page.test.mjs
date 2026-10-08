import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import nunjucks from "nunjucks";
import buildTOC from "eleventy-plugin-toc/src/BuildTOC.js";
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
  expect(html).toContain("I'm finishing my");
  expect(html).toContain('href="https://contact-from-current.pages.dev"');
  expect(html).toMatch(/href="https:\/\/research\.jdranpariya\.com\/"[^>]*>interest<\/a>/);
  expect(html).toContain("during my M.Sc. at");
  expect(html).toContain('href="https://www.fau.eu/"');
  expect(html).toContain('href="https://github.com/JDRanpariya/ball-balancing-on-arc"');
  expect(html).not.toContain('href="http://M.Sc"');
  expect(html).toContain('href="https://x.com/jdranpariya"');
  expect(html).not.toContain("Book a call");
  expect(html).not.toContain("Send me an email");
  expect(html).not.toContain("calendly.com");
  expect(html).not.toContain("btn-primary");
  expect(html).not.toContain("post-hero__meta");
});

test("post TOC only renders when the article body has indexed headings", () => {
  const layout = parseDocument(readFileSync("src/_includes/layouts/post.njk", "utf8")).body;
  const env = new nunjucks.Environment();
  env.addFilter("toc", (content) => buildTOC(content, { tags: ["h2", "h3"] }));
  env.addFilter("smartTitleCase", (value) => value);
  env.addFilter("relatedPosts", () => []);
  const render = (content) =>
    env.renderString(layout, {
      content,
      title: "Example",
      section: "notes",
      page: { url: "/notes/example/" },
      collections: { writings: [] },
    });
  for (const content of ["<p>A post without subheadings.</p>", "<h1>Title only</h1><p>Text.</p>"]) {
    const html = render(content);
    expect(html).not.toContain("On this page");
    expect(html).not.toContain("toc-panel");
    expect(html).toContain('class="min-w-0 lg:col-start-2"');
  }
  const html = render('<h2 id="first">First topic</h2><p>Text.</p><h3 id="second">Subtopic</h3>');
  expect(html).toContain('aria-label="On this page"');
  expect(html).toContain('<details class="lg:hidden');
  expect(html.match(/href="#first"/g)).toHaveLength(2);
  expect(html.match(/href="#second"/g)).toHaveLength(2);
});
