export const MAX_MEDIA_BYTES = 16 * 1024 * 1024;
export function safeMediaPath(value) {
  const path = String(value || "");
  return /^assets\/images\/uploads\/[a-f0-9]{64}\.jpg$/.test(path) ? path : null;
}
export function libraryMediaPath(value) {
  const path = String(value || "");
  return /^assets\/images\/[a-zA-Z0-9_./-]+\.(?:jpe?g|png|webp|avif)$/i.test(path) &&
    !path.includes("..") &&
    !path.includes("//")
    ? path
    : null;
}
export async function validateMedia(media, source) {
  if (!Array.isArray(media) || media.length > 64)
    throw new Error("Choose up to 64 new photos per publish.");
  const paths = new Set();
  let total = 0;
  for (const photo of media) {
    if (
      !safeMediaPath(photo.path) ||
      paths.has(photo.path) ||
      typeof photo.content !== "string" ||
      !source.includes(`/${photo.path}`)
    )
      throw new Error("Invalid or unreferenced photo.");
    paths.add(photo.path);
    if (photo.content.length > 2_800_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(photo.content))
      throw new Error("Invalid photo data.");
    const bytes = Uint8Array.from(atob(photo.content), (c) => c.charCodeAt(0));
    total += bytes.length;
    if (
      bytes.length > 2 * 1024 * 1024 ||
      total > MAX_MEDIA_BYTES ||
      bytes[0] !== 255 ||
      bytes[1] !== 216 ||
      bytes[2] !== 255
    )
      throw new Error("Photos must be JPEG files under 2 MB each, 16 MB total.");
    const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    if (photo.path !== `assets/images/uploads/${hash}.jpg`)
      throw new Error("Photo content does not match its file name.");
  }
  return media;
}

// Files and photos become visible in one non-forced Git commit. A racing writer
// causes a conflict instead of overwriting another edit or a partial publish.
export async function publishWithMedia({
  github,
  repository,
  branch,
  path,
  sha,
  content,
  message,
  media,
}) {
  const get = async (suffix) => {
    const result = await github(`/repos/${repository}${suffix}`);
    if (!result.response.ok)
      throw new Error(result.payload.message || "Could not read the repository.");
    return result.payload;
  };
  const post = async (suffix, body) => {
    const result = await github(`/repos/${repository}${suffix}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!result.response.ok)
      throw new Error(result.payload.message || "GitHub rejected the publish.");
    return result.payload;
  };
  const ref = await get(`/git/ref/heads/${branch}`),
    head = ref.object.sha;
  const commit = await get(`/git/commits/${head}`),
    tree = await get(`/git/trees/${commit.tree.sha}?recursive=1`);
  if (tree.truncated)
    throw new Error("The repository index is incomplete. Publishing was stopped.");
  const current = tree.tree.find((file) => file.path === path);
  if ((current?.sha || null) !== (sha || null)) return { conflict: true };
  const entries = [];
  const document = await post("/git/blobs", { content, encoding: "utf-8" });
  entries.push({ path, mode: "100644", type: "blob", sha: document.sha });
  for (const photo of media) {
    const existing = tree.tree.find((file) => file.path === photo.path);
    if (existing) continue;
    const blob = await post("/git/blobs", { content: photo.content, encoding: "base64" });
    entries.push({ path: photo.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const nextTree = await post("/git/trees", { base_tree: commit.tree.sha, tree: entries });
  const next = await post("/git/commits", { message, tree: nextTree.sha, parents: [head] });
  const update = await github(`/repos/${repository}/git/refs/heads/${branch}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sha: next.sha, force: false }),
  });
  if (!update.response.ok) {
    if ([409, 422].includes(update.response.status)) return { conflict: true };
    throw new Error(update.payload.message || "Could not publish the commit.");
  }
  return {
    path,
    sha: document.sha,
    commitUrl: `https://github.com/${repository}/commit/${next.sha}`,
  };
}
