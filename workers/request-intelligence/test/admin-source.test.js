import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { validateAdminSource } from "../src/admin-source.js";
import { validateSourceData } from "../../../scripts/frontmatter-schema.js";

const writing = (fields = "") =>
  `---\ntitle: Note\ndescription: A note\npublished: 2026-10-08\ntags: []\nsection: writings\nlayout: layouts/post.njk\n${fields}---\n\nBody\n`;

test("editor uses canonical personal build schema for nested content", () => {
  assert.deepEqual(validateSourceData({ title: "Nested" }, "src/writings/deep/note.md"), [
    "src/writings/deep/note.md: missing required field 'description'",
    "src/writings/deep/note.md: missing required field 'published'",
    "src/writings/deep/note.md: missing required field 'tags'",
    "src/writings/deep/note.md: missing required field 'section'",
    "src/writings/deep/note.md: missing required field 'layout'",
    "src/writings/deep/note.md: field 'section' = undefined not in allowed values [\"writings\"]",
    "src/writings/deep/note.md: field 'tags' expected array, got undefined",
    "src/writings/deep/note.md: field 'published' expected date, got undefined",
  ]);
  assert.equal(validateAdminSource("src/writings/deep/note.md", writing()).title, "Note");
});

test("malformed frontmatter, dates, layouts and permalinks are blocked", () => {
  for (const source of [
    "Body only",
    "---\ntitle: [\n---\nBody",
    "---\n- not a mapping\n---\nBody",
    writing("status: publised\n"),
    writing().replace("2026-10-08", '"2026-02-31"'),
    writing().replace("2026-10-08", "2026-02-31"),
    writing().replace("layouts/post.njk", "layouts/missing.njk"),
    writing("permalink: https://evil.example\n"),
    writing("tags: nope\n"),
  ])
    assert.throws(() => validateAdminSource("src/writings/test.md", source));
});

test("research and now metadata retain their actual publishing contracts", () => {
  assert.deepEqual(
    validateAdminSource("apps/research/content/research-home.md", "# Research\nQuestions"),
    {}
  );
  assert.throws(() => validateAdminSource("apps/research/content/research-home.md", "Questions"));
  const research =
    "---\ntitle: Memory\nstatus: published\nlayout: public.njk\npermalink: /notes/memory/\n---\nBody";
  assert.equal(validateAdminSource("apps/research/content/memory.md", research).title, "Memory");
  assert.throws(() =>
    validateAdminSource(
      "apps/research/content/memory.md",
      research.replace("/notes/memory/", "/library/")
    )
  );
  assert.throws(() =>
    validateAdminSource(
      "apps/research/content/memory.md",
      research.replace("published", "publised")
    )
  );
  assert.equal(
    validateAdminSource(
      "src/now/updates/2026-10-08.md",
      "---\ndate: 2026-10-08\nlayout: false\n---\nBody"
    ).layout,
    false
  );
});

test("the guard accepts every current personal source without rewriting it", async () => {
  // Read sources without mutating any author-owned files.
  async function verify(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await verify(path);
      else if (entry.name.endsWith(".md")) {
        const source = await readFile(path, "utf8");
        assert.doesNotThrow(() => validateAdminSource(path, source), path);
      }
    }
  }
  await verify("src");
});
