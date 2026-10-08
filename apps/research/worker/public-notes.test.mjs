import { test, expect } from "bun:test";
import worker from "./index";
import { readFileSync } from "node:fs";

test("the index exposes both collections and sign-in even with no published entries", () => {
  const source = readFileSync(new URL("../site/index/index.njk", import.meta.url), "utf8");
  expect(source).toContain('href="/library/great-minds"');
  expect(source).toContain('href="/library/neuroai"');
  expect(source).toContain('href="/login?returnTo=%2Flibrary%2Fgreat-minds"');
  expect(source).toContain('aria-label="Research collections"');
});

test("public notes route to generated assets, not the private database index", async () => {
  const paths = [];
  const env = {
    ASSETS: {
      fetch: async (request) => {
        paths.push(new URL(request.url).pathname);
        return new Response("Note", { status: 200 });
      },
    },
    DB: {
      prepare: () => {
        throw new Error("Private database must not be queried");
      },
    },
  };
  const response = await worker.fetch(
    new Request("https://research.jdranpariya.com/notes/learning/memory/"),
    env
  );
  expect(response.status).toBe(200);
  expect(paths).toEqual(["/notes/learning/memory/index.html"]);
  const redirect = await worker.fetch(
    new Request("https://research.jdranpariya.com/notes/learning/memory"),
    env
  );
  expect(redirect.status).toBe(301);
  expect(redirect.headers.get("location")).toBe(
    "https://research.jdranpariya.com/notes/learning/memory/"
  );
  const missing = await worker.fetch(
    new Request("https://research.jdranpariya.com/notes/missing/"),
    { ...env, ASSETS: { fetch: async () => new Response("Missing", { status: 404 }) } }
  );
  expect(missing.status).toBe(404);
});
