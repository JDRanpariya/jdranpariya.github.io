import { expect, test } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import nunjucks from "nunjucks";
import { researchReadingPages, researchArticle } from "./reading-pages.mjs";
import { renderDocument } from "../../../scripts/admin-renderer.mjs";

const homeSource = readFileSync(new URL("../content/research-home.md", import.meta.url), "utf8");
const pagePath = "apps/research/site/publications/index.md";
const pageSource = readFileSync(new URL("../site/publications/index.md", import.meta.url), "utf8");

test("publications have an editable page, not a duplicate list on the homepage", () => {
  expect(homeSource).not.toContain("## Publications");
  expect(homeSource).not.toContain("/publications/");
  expect(researchArticle(pagePath)?.route).toBe("/publications/");
  const rendered = renderDocument(pageSource, pagePath);
  expect(rendered.researchReading).toBe(true);
  const html = rendered.html;
  expect(html).toContain("<h1>Publications</h1>");
  expect(html).toContain("A Ball-on-Arc Benchmark:");
  expect(html).toContain(
    "Learning Contact Representations from Zero-Cost Proprioceptive Effort Signals"
  );
  expect(html).toContain("Master's thesis manuscript");
  const titles = [...html.matchAll(/<li>\s*<p><strong>(.*?)<\/strong><\/p>/g)].map(
    (match) => match[1]
  );
  expect(titles).toHaveLength(2);
  expect(titles.every((title) => !title.includes("<a"))).toBe(true);
  expect(html.match(/href="\/publications\/[^"#]+\.pdf"/g)).toHaveLength(2);
  expect(html).not.toContain("peer-reviewed");
  expect(html).toContain('href="https://contact-from-current.pages.dev/"');
  const downloads = [
    ...new Set(
      [...html.matchAll(/href="(\/publications\/[^"#]+\.pdf)"/g)].map((match) => match[1])
    ),
  ];
  expect(downloads.sort()).toEqual([
    "/publications/ball-on-arc-arxiv.pdf",
    "/publications/thesis.pdf",
  ]);
  for (const href of downloads) {
    const path = fileURLToPath(new URL(`../public${href}`, import.meta.url));
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path).subarray(0, 5).toString()).toBe("%PDF-");
  }
});

test("publications use the shared research navigation and active-page state", () => {
  const template = readFileSync(
    new URL("../site/_includes/components/research-navigation.njk", import.meta.url),
    "utf8"
  );
  for (const pageKind of ["research", "rl", "publications"]) {
    const html = nunjucks.renderString(template, { pageKind, researchReadingPages });
    expect(html).toContain('href="/publications/"');
    expect(html).toMatch(/>\s*Publications<\/a\s*>/);
    if (pageKind === "publications")
      expect(html).toMatch(/href="\/publications\/"\s+aria-current="page"/);
  }
});
