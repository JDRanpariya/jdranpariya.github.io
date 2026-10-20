import { test, expect } from "bun:test";
import { parseResearchHome, renderResearchHome } from "./research-home.ts";
import { readFileSync } from "node:fs";
import { researchReadingPages } from "./reading-pages.mjs";

test("ordinary Markdown preserves headings, lists and closing notes without custom regrouping", () => {
  const source =
    "# Research\n\n## Learning {#learning}\n\n- **Memory**: Question?\n\n*My closing note.*\n\n---\n\n### A plain heading\n\n**Bold** and `code`.";
  const doc = parseResearchHome(source);
  expect(doc.body).toBe(source);
  const html = renderResearchHome(doc);
  expect(html).toContain('<h2 id="learning">Learning</h2>');
  expect(html).toContain("</ul>\n<p><em>My closing note.</em></p>");
  expect(html).toContain("<h3>A plain heading</h3>");
  expect(html).toContain("<strong>Bold</strong> and <code>code</code>");
});

test("wiki links become native links and unsafe Markdown remains inert", () => {
  const doc = parseResearchHome(
    "# Research\n\n[[memory|Memory]]\n\n<script>alert(1)</script>\n\n[Bad](javascript:alert(1))"
  );
  doc.notes = [{ slug: "memory", title: "Memory", body: "", url: "/notes/memory/" }];
  const html = renderResearchHome(doc);
  expect(html).toContain('href="/notes/memory/"');
  expect(html).not.toContain("<script>");
  expect(html).not.toContain('href="javascript:');
});

test("all public reading sources use the same Eleventy layout and overview contract", () => {
  for (const page of researchReadingPages) {
    const source = readFileSync(page.path.replace("apps/research/", ""), "utf8");
    expect(source).toContain("layout: public.njk");
    expect(source).toContain("interestOverview: true");
    if (page.slug === "reinforcement-learning")
      expect(source).not.toContain("## Areas of interest");
    else expect(source).toContain("## Areas of interest");
  }
  const template =
    readFileSync("site/_includes/public.njk", "utf8") +
    readFileSync("site/_includes/components/research-document.njk", "utf8");
  expect(template).toContain('data-note-trail="research"');
  expect(template).not.toContain("research-root");
  const client = readFileSync("client/main.tsx", "utf8");
  expect(client).not.toContain("ResearchNotes");
});
