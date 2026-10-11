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

test("RL interests are ordinary public Markdown with all 60 supplied paper links", () => {
  const source = readFileSync(
    new URL("../site/reinforcement-learning/index.md", import.meta.url),
    "utf8"
  );
  expect(source).toContain("permalink: /reinforcement-learning/index.html");
  expect(source).toContain("status: published");
  expect(source.match(/^- \[[^\]]+\]\(https:\/\/[^)]+\)/gmu)).toHaveLength(60);
  expect(source.match(/^## /gmu)).toHaveLength(6);
  expect(source).not.toContain("<details");
  expect(source).not.toContain("05b-rl-review-papers.md");
  expect(source).not.toContain("117 checked reviews");
  expect(source).not.toContain("page:skip");
  expect(source).not.toContain("noindex: true");
});

test("shared public navigation puts RL between Research and Index", () => {
  const source = readFileSync(new URL("../site/_includes/public.njk", import.meta.url), "utf8");
  const research = source.search(/>\s*Research\s*<\/a\s*>/u);
  const rl = source.search(/>\s*RL\s*<\/a\s*>/u);
  const index = source.search(/>\s*Index\s*<\/a\s*>/u);
  expect(research).toBeGreaterThan(-1);
  expect(rl).toBeGreaterThan(research);
  expect(index).toBeGreaterThan(rl);
  expect(source).toContain('href="/reinforcement-learning/"');
  expect(source).toContain('pageKind == "rl"');
});

test("RL is public without consulting the private database and redirects URL aliases", async () => {
  const paths = [];
  const env = {
    ASSETS: {
      fetch: async (request) => {
        paths.push(new URL(request.url).pathname);
        return new Response("Public RL page", { status: 200 });
      },
    },
    DB: {
      prepare: () => {
        throw new Error("Private database must not be queried");
      },
    },
  };
  for (const method of ["GET", "HEAD"]) {
    const response = await worker.fetch(
      new Request("https://research.jdranpariya.com/reinforcement-learning/", { method }),
      env
    );
    expect(response.status).toBe(200);
  }
  expect(paths).toEqual([
    "/reinforcement-learning/index.html",
    "/reinforcement-learning/index.html",
  ]);
  for (const path of ["/reinforcement-learning", "/reinforcement-learning/index.html"]) {
    const response = await worker.fetch(
      new Request(`https://research.jdranpariya.com${path}?source=test`),
      env
    );
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "https://research.jdranpariya.com/reinforcement-learning/?source=test"
    );
  }
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
