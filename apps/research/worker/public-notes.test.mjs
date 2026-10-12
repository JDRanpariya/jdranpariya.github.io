import { test, expect } from "bun:test";
import worker from "./index";
import { readFileSync } from "node:fs";
import { noteHtml, parseNote } from "../lib/note-authoring.mjs";

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
  expect(source.match(/^## /gmu)).toHaveLength(7);
  expect(source).not.toContain("<details");
  expect(source).not.toContain("05b-rl-review-papers.md");
  expect(source).not.toContain("117 checked reviews");
  expect(source).not.toContain("page:skip");
  expect(source).not.toContain("noindex: true");
});

test("NeuroAI interests are ordinary public Markdown with all 48 supplied paper links", () => {
  const source = readFileSync(new URL("../site/neuro-ai/index.md", import.meta.url), "utf8");
  expect(source).toContain("permalink: /neuro-ai/index.html");
  expect(source).toContain("status: published");
  expect(source.match(/^- \[[^\]]+\]\(https:\/\/[^)]+\)/gmu)).toHaveLength(48);
  expect(source.match(/^## /gmu)).toHaveLength(6);
  expect(source.match(/^### /gmu)).toHaveLength(14);
  expect(source).not.toContain("<details");
  expect(source).not.toContain("09b-neuroai-review-papers.md");
  expect(source).not.toContain("103 checked reviews");
  expect(source).not.toContain("page:skip");
  expect(source).not.toContain("noindex: true");
});

test("Bio-inspired interests preserve all 48 supplied papers without internal build notes", () => {
  const source = readFileSync(new URL("../site/bio-inspired/index.md", import.meta.url), "utf8");
  expect(source).toContain("permalink: /bio-inspired/index.html");
  expect(source).toContain("status: published");
  expect(source.match(/^- \[[^\]]+\]\(https:\/\/[^)]+\)/gmu)).toHaveLength(48);
  expect(source.match(/^### /gmu)).toHaveLength(15);
  expect(source).not.toContain("10b-bioinspired-review-papers.md");
  expect(source).not.toContain("104 checked reviews");
  expect(source).not.toContain("page:skip");
  expect(source).not.toContain("noindex: true");
});

test.each([
  ["reinforcement-learning", 12, 4],
  ["neuro-ai", 14, 4],
  ["bio-inspired", 15, 5],
])("%s has plain bullet subtopics and linked topic headings", (slug, count, branches) => {
  const source = readFileSync(new URL(`../site/${slug}/index.md`, import.meta.url), "utf8");
  const { data, body } = parseNote(source);
  const overview = body.split(/## (?:Start here|Reading list)/u)[0];
  const html = noteHtml(body, {});
  const ids = [...html.matchAll(/\bid="([^"]+)"/gu)].map((match) => match[1]);
  const links = [...overview.matchAll(/\]\(#([^)]+)\)/gu)].map((match) => match[1]);
  expect(data.interestOverview).toBe(true);
  expect(overview.match(/^- \*\*\[/gmu)).toHaveLength(branches);
  expect(overview.match(/^  - /gmu)).toHaveLength(count);
  expect(overview).not.toContain(" · ");
  expect(overview).not.toMatch(/^  - \[/mu);
  expect(links).toHaveLength(branches);
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of links) expect(ids).toContain(id);
  expect(html).not.toContain("{#");
  expect(html).not.toContain("<details");
});

test("shared public navigation links home, RL, NeuroAI, Bio-inspired and Index", () => {
  const source = readFileSync(new URL("../site/_includes/public.njk", import.meta.url), "utf8");
  const home = source.search(/>\s*Jay Ranpariya\s*<\/a\s*>/u);
  const rl = source.search(/>\s*RL\s*<\/a\s*>/u);
  const neuroai = source.search(/>\s*NeuroAI\s*<\/a\s*>/u);
  const bioinspired = source.search(/>\s*Bio-inspired\s*<\/a\s*>/u);
  const index = source.search(/>\s*Index\s*<\/a\s*>/u);
  expect(home).toBeGreaterThan(-1);
  expect(rl).toBeGreaterThan(home);
  expect(neuroai).toBeGreaterThan(rl);
  expect(bioinspired).toBeGreaterThan(neuroai);
  expect(index).toBeGreaterThan(bioinspired);
  expect(source).toContain('href="/reinforcement-learning/"');
  expect(source).toContain('pageKind == "rl"');
  expect(source).toContain('href="/neuro-ai/"');
  expect(source).toContain('pageKind == "neuroai"');
  expect(source).toContain('href="/bio-inspired/"');
  expect(source).toContain('pageKind == "bioinspired"');
  expect(source).not.toMatch(/>\s*Research\s*<\/a\s*>/u);
  expect(source.match(/href="\/"/gu)).toHaveLength(1);
});

test.each(["reinforcement-learning", "neuro-ai", "bio-inspired"])(
  "%s is public without consulting the private database and redirects URL aliases",
  async (slug) => {
    const paths = [];
    const env = {
      ASSETS: {
        fetch: async (request) => {
          paths.push(new URL(request.url).pathname);
          return new Response("Public reading page", { status: 200 });
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
        new Request(`https://research.jdranpariya.com/${slug}/`, { method }),
        env
      );
      expect(response.status).toBe(200);
    }
    expect(paths).toEqual([`/${slug}/index.html`, `/${slug}/index.html`]);
    for (const path of [`/${slug}`, `/${slug}/index.html`]) {
      const response = await worker.fetch(
        new Request(`https://research.jdranpariya.com${path}?source=test`),
        env
      );
      expect(response.status).toBe(301);
      expect(response.headers.get("location")).toBe(
        `https://research.jdranpariya.com/${slug}/?source=test`
      );
    }
  }
);

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
