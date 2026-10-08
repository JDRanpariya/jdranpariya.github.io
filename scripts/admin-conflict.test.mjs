import { test, expect } from "bun:test";
import { draftConflicts, publishedCurrent, conflictedCurrent } from "../admin/lib/conflict.js";

test("a new local draft conflicts with a file created remotely at the same path", () => {
  expect(draftConflicts({ sha: null, content: "Local" }, { sha: "new", content: "Remote" })).toBe(
    true
  );
  expect(draftConflicts({ sha: null, content: "Local" }, { sha: null, content: "" })).toBe(false);
  expect(draftConflicts(undefined, { sha: "new", content: "Remote" })).toBe(false);
  expect(draftConflicts({ sha: "old", content: "Same" }, { sha: "new", content: "Same" })).toBe(
    false
  );
});

test("a successful publish keeps later edits as a draft based on the new SHA", () => {
  const active = { path: "src/writings/test.md", sha: "old", content: "Published" };
  const current = { ...active, content: "Edited while publishing", draftSaved: true };
  expect(publishedCurrent(active, current, "new")).toEqual({
    ...current,
    sha: "new",
    draftSha: "new",
    remoteContent: "Published",
    dirty: true,
    conflict: false,
  });
  expect(publishedCurrent(active, active, "new").dirty).toBe(false);
  const other = { path: "src/writings/other.md", content: "Other" };
  expect(publishedCurrent(active, other, "new")).toBe(other);
});

test("a publish conflict loads the remote version without blessing the stale draft", () => {
  const active = { path: "src/writings/test.md", sha: "old", content: "Draft" };
  const remote = { sha: "remote", content: "Remote source" };
  expect(conflictedCurrent(active, { ...active, content: "Latest draft" }, remote)).toMatchObject({
    content: "Latest draft",
    sha: "remote",
    draftSha: "old",
    remoteContent: "Remote source",
    conflict: true,
  });
  expect(conflictedCurrent(active, { ...active, draftSha: null }, remote).draftSha).toBeNull();
  const other = { path: "src/writings/other.md", content: "Other" };
  expect(conflictedCurrent(active, other, remote)).toBe(other);
});
