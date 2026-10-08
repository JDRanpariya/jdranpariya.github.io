import test from "node:test";
import assert from "node:assert/strict";
import { safeMediaPath, validateMedia, publishWithMedia } from "../src/admin-media.js";

async function fixture() {
  const bytes = Uint8Array.from([255, 216, 255, 224, 0, 0, 255, 217]);
  const hash = Buffer.from(await crypto.subtle.digest("SHA-256", bytes)).toString("hex");
  return {
    path: `assets/images/uploads/${hash}.jpg`,
    content: Buffer.from(bytes).toString("base64"),
  };
}
test("media is content-addressed, JPEG-only, referenced and bounded", async () => {
  const photo = await fixture();
  assert.equal(safeMediaPath(photo.path), photo.path);
  assert.equal(safeMediaPath("assets/images/uploads/../secret.jpg"), null);
  assert.deepEqual(await validateMedia([photo], `![View](/${photo.path})`), [photo]);
  await assert.rejects(() => validateMedia([photo], "No photo reference"));
  await assert.rejects(() => validateMedia([photo, photo], `/${photo.path}`));
  await assert.rejects(() =>
    validateMedia(
      [{ ...photo, content: Buffer.from("<script>").toString("base64") }],
      `/${photo.path}`
    )
  );
  await assert.rejects(() =>
    validateMedia(
      [{ ...photo, path: photo.path.replace(/[a-f0-9]{64}/, "a".repeat(64)) }],
      `/${photo.path.replace(/[a-f0-9]{64}/, "a".repeat(64))}`
    )
  );
});
test("post and photos publish atomically with non-forced ref update", async () => {
  const photo = await fixture(),
    calls = [];
  const github = async (path, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ path, method: init.method || "GET", body });
    let payload = { sha: "new-sha" };
    if (path.endsWith("/git/ref/heads/main")) payload = { object: { sha: "head" } };
    else if (path.endsWith("/git/commits/head")) payload = { tree: { sha: "base-tree" } };
    else if (path.includes("/git/trees/base-tree"))
      payload = { tree: [{ path: "src/writings/test.md", sha: "old-sha" }] };
    else if (path.endsWith("/git/blobs"))
      payload = { sha: body.encoding === "utf-8" ? "document" : "image" };
    return { response: { ok: true, status: 200 }, payload };
  };
  const args = {
    github,
    repository: "owner/repo",
    branch: "main",
    path: "src/writings/test.md",
    sha: "old-sha",
    content: `/${photo.path}`,
    message: "update test",
    media: [photo],
  };
  const result = await publishWithMedia(args);
  assert.equal(result.sha, "document");
  const tree = calls.find((call) => call.method === "POST" && call.path.endsWith("/git/trees"));
  assert.deepEqual(
    tree.body.tree.map((entry) => entry.path),
    [args.path, photo.path]
  );
  assert.deepEqual(calls.at(-1).body, { sha: "new-sha", force: false });
  calls.length = 0;
  assert.deepEqual(await publishWithMedia({ ...args, sha: "stale" }), { conflict: true });
  assert.equal(
    calls.some((call) => call.method !== "GET"),
    false
  );
});
test("a competing branch update cannot publish a partial batch", async () => {
  const github = async (path, init = {}) => {
    if (init.method === "PATCH")
      return { response: { ok: false, status: 422 }, payload: { message: "Race" } };
    const payload = path.endsWith("/git/ref/heads/main")
      ? { object: { sha: "head" } }
      : path.endsWith("/git/commits/head")
        ? { tree: { sha: "base" } }
        : path.includes("/git/trees/base")
          ? { tree: [] }
          : { sha: "new" };
    return { response: { ok: true }, payload };
  };
  assert.deepEqual(
    await publishWithMedia({
      github,
      repository: "o/r",
      branch: "main",
      path: "src/notes/test.md",
      content: "body",
      media: [],
      message: "add test",
    }),
    { conflict: true }
  );
});
