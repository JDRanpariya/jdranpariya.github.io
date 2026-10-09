// Loopback-only, disposable preview. No production secrets or database writes.
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { sqliteD1 } from "../workers/request-intelligence/test/d1-fixture.js";
import {
  handleGuestbookRequest,
  manageGuestbook,
} from "../workers/request-intelligence/src/guestbook.js";

const database = new Database(":memory:");
database.exec(
  readFileSync(
    new URL("../workers/request-intelligence/migrations/0001_guestbook.sql", import.meta.url),
    "utf8"
  )
);
const env = { GUESTBOOK_DB: sqliteD1(database), IP_HASH_SECRET: crypto.randomUUID() };
const buildRoot = resolve(import.meta.dir, "../build");
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 8793,
  async fetch(request) {
    const url = new URL(request.url);
    const headers = new Headers(request.headers);
    headers.set("CF-Connecting-IP", "127.0.0.1");
    const incoming = new Request(request, { headers });
    const response = await handleGuestbookRequest(incoming, env);
    if (response) return response;
    if (url.pathname === "/api/admin/session")
      return Response.json({
        authenticated: true,
        readOnly: true,
        login: "local-preview",
        csrf: "loopback-only",
        features: { guestbook: true },
      });
    if (url.pathname === "/api/admin/guestbook") {
      if (
        request.method !== "GET" &&
        (request.headers.get("origin") !== url.origin ||
          request.headers.get("x-csrf-token") !== "loopback-only")
      )
        return new Response("Not allowed", { status: 403 });
      return manageGuestbook(request, env);
    }
    if (url.pathname.startsWith("/api/admin/") && request.method === "GET")
      return fetch(`http://127.0.0.1:8084${url.pathname}${url.search}`);
    if (request.method !== "GET") return new Response("Not allowed", { status: 405 });
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith("/")) path += "index.html";
    const target = resolve(buildRoot, `.${path}`);
    if (relative(buildRoot, target).startsWith(".."))
      return new Response("Not found", { status: 404 });
    const file = Bun.file(target);
    return (await file.exists())
      ? new Response(file, { headers: { "Cache-Control": "no-store" } })
      : new Response("Not found", { status: 404 });
  },
});
console.log(`Disposable guestbook preview: http://${server.hostname}:${server.port}/guestbook/`);
