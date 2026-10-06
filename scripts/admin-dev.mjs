// Local-only preview. Repository sources are read, never written or published.
import { readdir, readFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { adminInternals } from "../workers/request-intelligence/src/admin.js";

const projectRoot = resolve(import.meta.dir, "..");
const buildRoot = resolve(projectRoot, "build");
const json = (value, status = 200) =>
  Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
async function filesUnder(path) {
  const entries = await readdir(resolve(projectRoot, path), { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const name = `${path}/${entry.name}`;
      if (entry.isDirectory()) return filesUnder(name);
      if (!entry.isFile() || !adminInternals.safeSourcePath(name)) return [];
      return [
        {
          path: name,
          sha: "local-source",
          size: (await readFile(resolve(projectRoot, name))).length,
        },
      ];
    })
  );
  return files.flat();
}
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: Number(process.env.ADMIN_PREVIEW_PORT || 8084),
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== "GET")
      return json({ error: "This local preview cannot publish or change repository files." }, 403);
    if (url.pathname === "/api/admin/session")
      return json({ authenticated: true, login: "local-preview", csrf: "", readOnly: true });
    if (url.pathname === "/api/admin/files")
      return json({
        files: [...(await filesUnder("src")), ...(await filesUnder("apps/research/content"))],
      });
    if (url.pathname === "/api/admin/file") {
      const path = adminInternals.safeSourcePath(url.searchParams.get("path"));
      if (!path) return json({ error: "Invalid source path." }, 400);
      try {
        const content = await readFile(resolve(projectRoot, path), "utf8");
        return json({ path, content, sha: createHash("sha1").update(content).digest("hex") });
      } catch {
        return json({ error: "File not found." }, 404);
      }
    }
    let path;
    try {
      path = decodeURIComponent(url.pathname);
    } catch {
      return new Response("Not found", { status: 404 });
    }
    if (path === "/") path = "/admin/index.html";
    if (path.endsWith("/")) path += "index.html";
    const target = resolve(buildRoot, `.${path}`);
    if (relative(buildRoot, target).startsWith(".."))
      return new Response("Not found", { status: 404 });
    const file = Bun.file(target);
    if (!(await file.exists())) return new Response("Not found", { status: 404 });
    return new Response(file, { headers: { "Cache-Control": "no-store" } });
  },
});
console.log(`Read-only admin preview: http://${server.hostname}:${server.port}/admin/`);
