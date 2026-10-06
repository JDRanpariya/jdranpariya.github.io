import { test, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { buildFileTree, parseDocument, renderDocument, titleCase } from "./admin-renderer.mjs";
import { sourceDirectories, creationPath, sourceUrl, newDocument } from "./admin-authoring.mjs";
import { folderChildren, contentEntry } from "./folder-index.mjs";

test("nested files keep their real directory and file names", () => {
  const paths = [
    "src/library/books/alchemist.md",
    "src/odysseys/codex/biology/origin.md",
    "src/odysseys/codex.md",
    "apps/research/content/research-home.md",
  ];
  const tree = buildFileTree(paths.map((path) => ({ path })));
  expect(tree.directories.size).toBe(2);
  expect(tree.directories.get("Personal site").path).toBe("src");
  expect(
    tree.directories.get("Personal site").directories.get("library").directories.get("books").path
  ).toBe("src/library/books");
  expect(
    tree.directories.get("Personal site").directories.get("library").directories.get("books")
      .files[0].path
  ).toBe(paths[0]);
  expect(tree.directories.get("Personal site").directories.get("odysseys").files[0].path).toBe(
    paths[2]
  );
  expect(
    buildFileTree(
      paths.map((path) => ({ path })),
      "research home"
    ).directories.size
  ).toBe(1);
});

test("creation targets any editable level without requiring a complete source path", () => {
  const files = [
    { path: "src/notes/topic/sub/index.md" },
    { path: "src/now/updates/2026-01-01.md" },
  ];
  expect(sourceDirectories(files)).toEqual([
    "apps/research/content",
    "src",
    "src/notes",
    "src/notes/topic",
    "src/notes/topic/sub",
  ]);
  expect(creationPath("src/notes/topic/sub", "new-note.md")).toBe(
    "src/notes/topic/sub/new-note.md"
  );
  expect(creationPath("src/notes/topic", "new-folder", "folder")).toBe(
    "src/notes/topic/new-folder/index.md"
  );
  expect(sourceUrl("src/notes/topic/new-folder/index.md")).toBe("/notes/topic/new-folder/");
  expect(sourceUrl("src/notes/topic/new-folder/entry.md")).toBe("/notes/topic/new-folder/entry/");
  for (const [directory, name] of [
    ["src/notes", "../bad"],
    ["src/notes", "a/b"],
    ["src/../other", "entry"],
    ["src/now/updates", "entry"],
    ["src/_data", "entry"],
    ["apps/research/content/../private", "entry"],
    ["apps/research/content", "research-home"],
    ["src", "admin"],
  ])
    expect(() => creationPath(directory, name)).toThrow();
});

test("research creation and preview use research routes and the shared renderer", () => {
  const path = creationPath("apps/research/content/learning", "memory", "folder");
  expect(path).toBe("apps/research/content/learning/memory/index.md");
  expect(sourceDirectories([{ path }])).toContain("apps/research/content/learning/memory");
  expect(sourceUrl(path)).toBe("https://research.jdranpariya.com/notes/learning/memory/");
  const source = newDocument({ path, title: "Memory", kind: "folder", date: "2026-10-05" });
  expect(parseDocument(source).frontmatter).toMatchObject({
    status: "draft",
    folderIndex: true,
    layout: "public.njk",
    permalink: "/notes/learning/memory/",
  });
  const preview = renderDocument(source + "## Practice\n\n- First\n- Second\n", path, [
    { path: "apps/research/content/learning/memory/test.md", frontmatter: { title: "Testing" } },
  ]);
  expect(preview.research).toBe(true);
  expect(preview.html).toContain('href="/notes/learning/memory/test/"');
  expect(preview.html).toContain("<h2>Practice</h2>");
  expect(preview.html).not.toContain("post-hero");
});

test("folder indices and nested files have explicit permalinks and usable frontmatter", () => {
  const folder = parseDocument(
    newDocument({
      path: "src/notes/topic/index.md",
      title: "Topic",
      kind: "folder",
      date: "2026-10-05",
    })
  ).frontmatter;
  expect(folder).toMatchObject({
    folderIndex: true,
    section: "folder",
    status: "draft",
    permalink: "/notes/topic/",
    layout: "layouts/folder.njk",
  });
  const page = parseDocument(
    newDocument({ path: "src/notes/topic/entry.md", title: "Entry", date: "2026-10-05" })
  ).frontmatter;
  expect(page).toMatchObject({
    section: "notes",
    status: "draft",
    permalink: "/notes/topic/entry/",
  });
  expect(
    parseDocument(
      newDocument({
        path: "src/library/books/sub/book.md",
        title: "A book",
        author: "Jay",
        date: "2026-10-05",
      })
    ).frontmatter.author
  ).toBe("Jay");
});

test("folder landing pages list only immediate children and stay out of article collections", () => {
  const item = (inputPath, title, extra = {}) => ({
    inputPath,
    url: sourceUrl(inputPath.replace(/^\.\//, "")),
    data: { title, ...extra },
  });
  const children = [
    item("./src/notes/topic/index.md", "topic", { folderIndex: true }),
    item("./src/notes/topic/entry.md", "entry"),
    item("src/notes/topic/sub/index.md", "sub", { folderIndex: true }),
    item("src/notes/topic/sub/deep.md", "deep"),
    item("src/notes/topic/draft.md", "draft", { status: "draft" }),
    item("src/notes/elsewhere.md", "elsewhere"),
  ];
  expect(
    folderChildren(children, "./src/notes/topic/index.md").map((item) => item.data.title)
  ).toEqual(["entry", "sub"]);
  expect(folderChildren(children, "src/notes/topic/index.md", true)).toHaveLength(3);
  expect(contentEntry(children[0], true)).toBe(false);
  expect(contentEntry(children[4])).toBe(false);
  expect(contentEntry(children[1])).toBe(true);
  const preview = renderDocument(
    newDocument({
      path: "src/notes/topic/index.md",
      title: "Topic",
      kind: "folder",
      date: "2026-10-05",
    }),
    "src/notes/topic/index.md",
    [{ path: "src/notes/topic/sub/index.md", frontmatter: { title: "Subfolder" } }]
  );
  expect(preview.html).toContain('href="/notes/topic/sub/"');
  expect(preview.html).toContain("Subfolder");
});

test("frontmatter handles comments, multiline descriptions and arrays", () => {
  const result = parseDocument(
    '---\ntitle: "Title: still correct" # comment\ndescription: >-\n  first line\n  second line\ntags: [ai, research]\n---\n\nBody'
  );
  expect(result.frontmatter.title).toBe("Title: still correct");
  expect(result.frontmatter.description).toBe("first line second line");
  expect(result.frontmatter.tags).toEqual(["ai", "research"]);
  expect(result.body).toContain("Body");
  expect(() => parseDocument("---\ntags: [\n---\nbody")).toThrow();
});

test("research uses its actual homepage structure with one title", async () => {
  const source = await readFile("apps/research/content/research-home.md", "utf8");
  const result = renderDocument(source, "apps/research/content/research-home.md");
  expect(result.research).toBe(true);
  expect(result.html.match(/<h1/g).length).toBe(1);
  expect(result.html).not.toContain(">research home<");
  expect(result.html).toContain('class="theme-list"');
  expect(result.html).not.toContain("{#");
});

test("personal preview uses the hero title, not fullTitle or a fabricated file heading", () => {
  const result = renderDocument(
    "---\ntitle: building better judgement\nfullTitle: should not be substituted\ndescription: A description\npublished: 2026-09-16\n---\n\n## Practice\n\nKeep trying.",
    "src/notes/test.md"
  );
  expect(result.html).toContain("Building Better Judgement");
  expect(result.html).not.toContain("should not be substituted");
  expect(result.html).toContain("Sep 16, 2026");
  expect(
    renderDocument("# Authored heading\n\nBody", "src/notes/plain.md").html.match(/<h1/g).length
  ).toBe(1);
});

test("supports the site's notes, references, callouts, tasks, maths and footnotes", () => {
  const source =
    "::: note\nAn aside\n:::\n\n::: references More reading\n- source\n:::\n\n> [!quote]\n> Quote\n\n- [ ] Task\n\n$x^2$\n\nA footnote[^1]\n\n[^1]: Details";
  const result = renderDocument(source, "src/notes/test.md");
  for (const marker of [
    "subtitle-note",
    "references-block",
    "callout",
    "task-list",
    "katex",
    "footnote",
  ])
    expect(result.html).toContain(marker);
});

test("display casing matches acronyms and small words", () => {
  expect(titleCase("what is physical ai")).toBe("What Is Physical AI");
  expect(titleCase("the codex of understanding")).toBe("The Codex of Understanding");
  expect(titleCase("neuroai")).toBe("NeuroAI");
});
