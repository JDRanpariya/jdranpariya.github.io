import { test, expect } from "bun:test";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Eleventy from "@11ty/eleventy";
import { loadPublicNotes } from "./public-notes.mjs";
import { noteHtml, researchRoute } from "./note-authoring.mjs";
import { ResearchNotes } from "../components/research-notes";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import configureResearchSite from "../eleventy.config.mjs";

test("nested research sources produce actual Eleventy pages, child indexes and sitemap, without leaking drafts", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "research-notes-"));
  try {
    const content = join(fixture, "content");
    await mkdir(join(content, "learning/sub"), { recursive: true });
    const source = (title, draft = false, folder = false) =>
      `---\ntitle: ${title}\nstatus: ${draft ? "draft" : "published"}\nfolderIndex: ${folder}\n---\n\n## Practice\n\n- A\n- B\n\n[[Memory]]\n`;
    await writeFile(join(content, "learning/index.md"), source("Learning", false, true));
    await writeFile(join(content, "learning/memory.md"), source("Memory"));
    await writeFile(join(content, "learning/sub/index.md"), source("Subfolder", false, true));
    await writeFile(join(content, "learning/sub/deep.md"), source("Deep"));
    await writeFile(join(content, "learning/private.md"), source("Secret draft", true));
    const notes = await loadPublicNotes(content);
    expect(notes).toHaveLength(5);
    const folder = notes.find((note) => note.title === "Learning");
    expect(folder.html).toContain('href="/notes/learning/memory/"');
    expect(folder.html).toContain('href="/notes/learning/sub/"');
    expect(folder.html).not.toContain("Secret draft");
    expect(folder.html).not.toContain('href="/notes/learning/sub/deep/"');
    const home = { title: "Research", body: "# Research", notes };
    const pages = notes.map((note) => ({
      ...note,
      description: "",
      pageHtml: renderToString(
        createElement(ResearchNotes, {
          initialDocument: home,
          initialPath: [],
          initialFocus: 0,
          rootSlug: note.slug,
        })
      ),
      bootstrap: JSON.stringify({ ...home, rootNote: note.slug }).replaceAll("<", "\\u003c"),
    }));
    const site = new Eleventy("site", join(fixture, "output"), {
      configPath: false,
      quietMode: true,
      config(config) {
        configureResearchSite(config);
        config.addGlobalData("researchNotes", pages);
        config.addGlobalData("researchHomeHtml", "<h1>Research</h1>");
        config.addGlobalData("researchHomeJson", JSON.stringify(home));
      },
    });
    await site.write();
    const html = await readFile(join(fixture, "output/notes/learning/memory/index.html"), "utf8");
    expect(html).toContain("<h1>Memory</h1>");
    expect(html).toContain("<h2>Practice</h2>");
    expect(html).toContain('class="research-note-body"');
    expect(html).not.toContain("Secret draft");
    const sitemap = await readFile(join(fixture, "output/sitemap.xml"), "utf8");
    expect(sitemap.startsWith("<?xml")).toBe(true);
    expect(sitemap).toContain("https://research.jdranpariya.com/notes/learning/memory/");
    expect(sitemap).not.toContain("private");
    expect(sitemap).not.toContain("library");
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}, 30000);

test("unsafe paths, malformed metadata and conflicting permalinks fail the build", async () => {
  expect(() => researchRoute("apps/research/content/../private.md")).toThrow();
  const fixture = await mkdtemp(join(tmpdir(), "research-invalid-"));
  try {
    await writeFile(
      join(fixture, "bad.md"),
      "---\ntitle: Bad\nstatus: published\npermalink: /library/neuroai\n---\nBody"
    );
    await expect(loadPublicNotes(fixture)).rejects.toThrow("permalink");
    await writeFile(join(fixture, "bad.md"), "---\ntitle: Bad\nstatus: publised\n---\nBody");
    await expect(loadPublicNotes(fixture)).rejects.toThrow("status");
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
  const html = noteHtml(
    "<script>alert(1)</script>\n\n[Bad](javascript:alert(1))",
    { folderIndex: false },
    []
  );
  expect(html).not.toContain("<script>");
  expect(html).not.toContain('href="javascript:');
});
