import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import nunjucks from "nunjucks";
import { titleCase } from "./admin-renderer.mjs";

const env = new nunjucks.Environment(new nunjucks.FileSystemLoader("src/_includes"), {
  autoescape: true,
});
env.addFilter("smartTitleCase", titleCase);
env.addFilter("isoDate", (date) => new Date(date).toISOString().slice(0, 10));
const render = (posts, options = {}) =>
  env.renderString(
    '{% from "components/post-index.njk" import postList %}{{ postList(posts, dated, level, fullTitles, sourceLinks) }}',
    { posts, dated: true, level: 2, fullTitles: false, sourceLinks: false, ...options }
  );

test("post indexes share the Writings date-and-title pattern without changing order", () => {
  const html = render([
    {
      url: "/first/",
      data: {
        title: "first entry",
        published: "2026-02-05",
        description: "Not a card",
        tags: ["ai"],
      },
    },
    { url: "/second/", data: { title: "second entry", published: new Date("2026-01-01") } },
  ]);
  expect(html).toContain('class="post-list"');
  expect(html).toContain('datetime="2026-02-05"');
  expect(html).toContain("2026 · 02");
  expect(html).toContain("2026 · 01");
  expect(html.indexOf('href="/first/"')).toBeLessThan(html.indexOf('href="/second/"'));
  expect(html).not.toContain("Not a card");
  expect(html).not.toContain("chip");
  // Keep class names as literal source tokens for Tailwind and PurgeCSS.
  const template = readFileSync("src/_includes/components/post-index.njk", "utf8");
  const tokens = template.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
  expect(tokens).toContain("post-list__link");
  expect(template).toContain('data-dated="');
});

test("undated lists omit dates and do not invent publication metadata", () => {
  const html = render([{ url: "/odysseys/purpose/", title: "Purpose" }], { dated: false });
  expect(html).toContain('data-dated="false"');
  expect(html).not.toContain("<time");
  expect(html).toContain("Purpose");
  const folder = render([{ url: "/folder/", data: { title: "Folder" } }]);
  expect(folder).not.toContain("<time");
  expect(folder).toContain('data-dated="false"');
  expect(html).not.toContain("undefined");
});

test("grouped indexes preserve full titles, external destinations and escaping", () => {
  const html = render(
    [
      {
        url: "/paper/",
        data: { title: "short", fullTitle: "full title", link: "https://example.test/paper" },
      },
      { url: "/unsafe/", data: { title: "<img src=x>" } },
    ],
    { level: 3, fullTitles: true, sourceLinks: true }
  );
  expect(html).toContain('<h3 class="post-list__title">Full Title</h3>');
  expect(html).toContain('href="https://example.test/paper"');
  expect(html).toContain('target="_blank" rel="noopener noreferrer"');
  expect(html).not.toContain("<img");
  expect(html).toContain("&lt;");
});

test("all text-post list templates and admin folder previews use the shared component", () => {
  for (const file of [
    "src/writings.njk",
    "src/notes.njk",
    "src/odysseys.njk",
    "src/index.njk",
    "src/tags.njk",
    "src/_includes/layouts/folder.njk",
    "src/library.njk",
    "src/odysseys/reckoning-the-dead.njk",
    "src/odysseys/the-alchemists-hearth.njk",
    "src/sitemap.html.njk",
  ]) {
    const template = readFileSync(file, "utf8");
    expect(template).toContain('from "components/post-index.njk"');
    expect(template).not.toContain('class="index-row"');
  }
  expect(readFileSync("scripts/build-admin-preview.mjs", "utf8")).toContain(
    '"components/post-index.njk"'
  );
});
