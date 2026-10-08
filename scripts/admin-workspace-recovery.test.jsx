import { expect, test } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  completeRepository,
  hydrateFileMetadata,
  optionalPhotos,
} from "../admin/hooks/useWorkspace.js";
import { Editor } from "../admin/components/Editor.jsx";

test("unavailable photo storage does not block text editing", async () => {
  const warnings = [];
  const photos = await optionalPhotos(
    async () => {
      throw new Error("IndexedDB denied");
    },
    (warning) => warnings.push(warning)
  );
  expect(photos).toEqual([]);
  expect(warnings).toEqual([
    "Photos are unavailable: IndexedDB denied. Text editing is still available.",
  ]);
});

test("truncated repository trees are not presented as complete", () => {
  expect(() => completeRepository({ files: [], truncated: true })).toThrow("incomplete");
  expect(completeRepository({ files: [], truncated: false })).toEqual({
    files: [],
    truncated: false,
  });
});

test("repository file list inherits published metadata without overriding newer metadata", () => {
  const result = hydrateFileMetadata(
    [
      { path: "src/writings/article.md", sha: "head" },
      { path: "src/notes/note.md", frontmatter: { title: "new title", status: "draft" } },
    ],
    {
      collections: {
        all: [
          {
            inputPath: "./src/writings/article.md",
            url: "/custom-article/",
            data: { title: "article", tags: ["AI"] },
          },
          { inputPath: "src/notes/note.md", data: { title: "old title", status: "published" } },
        ],
      },
    }
  );
  expect(result[0].frontmatter).toEqual({ title: "article", tags: ["AI"] });
  expect(result[0].publicUrl).toBe("/custom-article/");
  expect(result[1].frontmatter).toEqual({ title: "new title", status: "draft" });
});

test("failed persistence is not described as a saved draft", () => {
  const html = renderToStaticMarkup(
    <Editor current={{ path: "src/test.md", content: "unsaved", dirty: true, draftSaved: false }} />
  );
  expect(html).toContain("Draft is not saved. Keep a copy before leaving.");
  expect(html).not.toContain("Draft saved in this browser");
});
