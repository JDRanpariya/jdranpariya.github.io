import { test, expect } from "bun:test";
import Eleventy from "@11ty/eleventy";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import configureSite from "../.eleventy.js";
import { newDocument } from "./admin-authoring.mjs";

test("actual Eleventy builds nested folder routes, child indices and sitemap without feed pollution", async () => {
  // Capture the production site's actual filters, collections and draft policy.
  const filters = new Map(),
    collections = new Map(),
    globals = new Map();
  const previous = process.env.ELEVENTY_ENV;
  process.env.ELEVENTY_ENV = "prod";
  try {
    configureSite(
      new Proxy(
        {},
        {
          get: (_, key) =>
            key === "addFilter"
              ? (name, fn) => filters.set(name, fn)
              : key === "addCollection"
                ? (name, fn) => collections.set(name, fn)
                : key === "addGlobalData"
                  ? (name, value) => globals.set(name, value)
                  : () => {},
        }
      )
    );
  } finally {
    if (previous === undefined) delete process.env.ELEVENTY_ENV;
    else process.env.ELEVENTY_ENV = previous;
  }
  const fixture = await mkdtemp(join(tmpdir(), "admin-indexing-"));
  const input = join(fixture, "src"),
    output = join(fixture, "output");
  try {
    await mkdir(join(input, "_includes/layouts"), { recursive: true });
    await mkdir(join(input, "_includes/components"), { recursive: true });
    await mkdir(join(input, "notes/topic/sub"), { recursive: true });
    await writeFile(
      join(input, "_includes/layouts/folder.njk"),
      await readFile("src/_includes/layouts/folder.njk", "utf8")
    );
    await writeFile(
      join(input, "_includes/components/post-index.njk"),
      await readFile("src/_includes/components/post-index.njk", "utf8")
    );
    await writeFile(
      join(input, "_includes/layouts/base.njk"),
      '<!doctype html><html lang="en"><title>{{ title }}</title><main>{{ content | safe }}</main></html>'
    );
    await writeFile(
      join(input, "_includes/layouts/post.njk"),
      "---\nlayout: layouts/base.njk\n---\n<h1>{{ title }}</h1>{{ content | safe }}"
    );
    // Deliberately preserve the notes directory's legacy slug-only permalink.
    await writeFile(
      join(input, "notes/notes.json"),
      await readFile("src/notes/notes.json", "utf8")
    );
    const files = [
      ["notes/topic/index.md", "Topic", "folder", true],
      ["notes/topic/sub/index.md", "Subfolder", "folder", true],
      ["notes/topic/entry.md", "Entry", "file", true],
      ["notes/topic/sub/entry.md", "Another entry", "file", true],
      ["notes/topic/draft.md", "Private draft", "file", false],
    ];
    for (const [path, title, kind, published] of files) {
      let source = newDocument({ path: `src/${path}`, title, kind, date: "2026-10-05" });
      if (published) source = source.replace('status: "draft"', 'status: "published"');
      await writeFile(join(input, path), source + "A fixture body.\n");
    }
    await writeFile(join(input, "sitemap.njk"), await readFile("src/sitemap.njk", "utf8"));
    const site = new Eleventy(input, output, {
      configPath: false,
      quietMode: true,
      config: (config) => {
        config.addGlobalData("site", { url: "https://example.test" });
        config.addGlobalData("eleventyComputed", globals.get("eleventyComputed"));
        for (const name of ["smartTitleCase", "dateToFormat", "isoDate", "folderChildren"])
          config.addFilter(name, filters.get(name));
        config.addCollection("__validateFrontmatter", collections.get("__validateFrontmatter"));
      },
    });
    await site.write();
    const html = await readFile(join(output, "notes/topic/index.html"), "utf8");
    expect(html).toContain('href="/notes/topic/entry/"');
    expect(html).toContain('href="/notes/topic/sub/"');
    expect(html).not.toContain("Private Draft");
    expect(html).not.toContain('href="/notes/topic/sub/entry/"');
    expect(await readFile(join(output, "notes/topic/sub/entry/index.html"), "utf8")).toContain(
      "Another entry".toLowerCase()
    );
    const sitemap = await readFile(join(output, "sitemap.xml"), "utf8");
    expect(sitemap).toContain("https://example.test/notes/topic/");
    expect(sitemap).toContain("https://example.test/notes/topic/sub/entry/");
    expect(sitemap).not.toContain("draft");
    const items = files.map(([path, title, kind, published]) => ({
      inputPath: `src/${path}`,
      data: {
        title,
        folderIndex: kind === "folder",
        status: published ? "published" : "draft",
        published: "2026-10-05",
      },
    }));
    const api = { getFilteredByGlob: (glob) => (glob === "src/notes/**/*.md" ? items : []) };
    expect(collections.get("notes")(api)).toHaveLength(2);
    expect(collections.get("feedEntries")(api)).toHaveLength(2);
  } finally {
    // Only this test's exact mkdtemp directory is removed.
    await rm(fixture, { recursive: true, force: true });
  }
}, 30000);
