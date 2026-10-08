import { expect, test } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  completeRepository,
  hydrateFileMetadata,
  optionalPhotos,
} from "../admin/hooks/useWorkspace.js";
import { Editor } from "../admin/components/Editor.jsx";
import {
  adoptRepositoryDraft,
  readDrafts,
  readDraftRecovery,
  saveDraft,
  forgetDraft,
} from "../admin/lib/storage.js";

function withStorage(run, failKey) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        if (key === failKey) throw new Error("Storage full");
        values.set(key, value);
      },
    },
  });
  try {
    run(values);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  }
}

test("repository choice preserves the old draft and survives reopening", () => {
  withStorage(() => {
    const path = "apps/research/content/research-home.md";
    saveDraft(path, "Browser draft", "old");
    const recovery = adoptRepositoryDraft(path, readDrafts()[path], {
      content: "Repo",
      sha: "new",
    });
    expect(readDrafts()[path]).toMatchObject({ content: "Repo", sha: "new" });
    expect(recovery).toMatchObject({ content: "Browser draft", sha: "old" });
    expect(readDraftRecovery(path)).toEqual(recovery);
    adoptRepositoryDraft(path, readDrafts()[path], { content: "Repo", sha: "new" });
    expect(readDraftRecovery(path)).toEqual(recovery);
  });
});

test("failed storage cannot replace either the current draft or its previous recovery", () => {
  withStorage((values) => {
    const path = "src/about.md";
    values.set(
      "site-admin-drafts-v1",
      JSON.stringify({
        [path]: {
          content: "Draft",
          sha: "old",
          recoveryDraft: { content: "Previous", sha: "base" },
        },
      })
    );
    expect(() =>
      adoptRepositoryDraft(path, readDrafts()[path], { content: "Repo", sha: "new" })
    ).toThrow("Storage full");
    expect(readDrafts()[path].content).toBe("Draft");
    expect(readDraftRecovery(path).content).toBe("Previous");
  }, "site-admin-drafts-v1");
});

test("publishing can clear the active draft without losing its recovery copy", () => {
  withStorage(() => {
    const path = "src/about.md";
    adoptRepositoryDraft(path, { content: "Draft", sha: "old" }, { content: "Repo", sha: "new" });
    saveDraft(path, "New edits", "new");
    expect(readDraftRecovery(path).content).toBe("Draft");
    forgetDraft(path);
    expect(readDrafts()[path]).toBeUndefined();
    expect(readDraftRecovery(path).content).toBe("Draft");
  });
});

test("both conflict and ordinary edited files offer a repository choice", () => {
  for (const conflict of [false, true]) {
    const html = renderToStaticMarkup(
      <Editor
        current={{ path: "src/about.md", content: "Draft", sha: "repo", dirty: true, conflict }}
      />
    );
    expect(html.match(/Use repository version/g)).toHaveLength(1);
  }
  const html = renderToStaticMarkup(
    <Editor current={{ path: "src/new.md", content: "New", sha: null, dirty: true }} />
  );
  expect(html).not.toContain("Use repository version");
});

test("a clean repository file exposes recovery without enabling publishing", () => {
  const html = renderToStaticMarkup(
    <Editor
      current={{
        path: "src/about.md",
        content: "Repo",
        sha: "head",
        dirty: false,
        recoveryDraft: { content: "Previous" },
      }}
    />
  );
  expect(html).toContain("Previous browser draft");
  expect(html).toContain("Restore previous draft");
  expect(html).toContain("Saved only in this browser");
  expect(html).toMatch(/id="admin-publish" disabled=""/);
});

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
