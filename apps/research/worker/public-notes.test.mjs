import { test, expect } from "bun:test";
import worker from "./index";
import { readFileSync } from "node:fs";
import { noteHtml, parseNote } from "../lib/note-authoring.mjs";
import { researchReadingPages, researchReadingPageKinds } from "../lib/reading-pages.mjs";
import nunjucks from "nunjucks";

test("the index exposes both collections and sign-in even with no published entries", () => {
  const source = readFileSync(new URL("../site/index/index.njk", import.meta.url), "utf8");
  expect(source).toContain('href="/library/great-minds"');
  expect(source).toContain('href="/library/neuroai"');
  expect(source).toContain('href="/login?returnTo=%2Flibrary%2Fgreat-minds"');
  expect(source).toContain('aria-label="Research collections"');
});

test("RL interests are ordinary public Markdown with all 82 supplied reading links", () => {
  const source = readFileSync(
    new URL("../site/reinforcement-learning/index.md", import.meta.url),
    "utf8"
  );
  expect(source).toContain("permalink: /reinforcement-learning/index.html");
  expect(source).toContain("status: published");
  expect(source.match(/^\s*- \[[^\]]+\]\(https?:\/\/[^)]+\)/gmu)).toHaveLength(82);
  expect(source.match(/^## /gmu)).toHaveLength(7);
  const problem = source.indexOf("## Problem formulation {#problem-formulation}");
  const safety = source.indexOf("## Safety and trust {#safety-and-trust}");
  expect(problem).toBeGreaterThan(-1);
  expect(safety).toBeGreaterThan(problem);
  const section = source.slice(problem, safety);
  expect(section.match(/^- \[/gmu)).toHaveLength(6);
  expect(section).toContain("### Markov decision processes and their variants");
  expect(section).toContain("### Partially observable MDPs");
  expect(section).toContain("### Predictive representations");
  expect(source.match(/^### /gmu)).toHaveLength(13);
  expect(source).not.toMatch(/^#### /mu);
  expect(source).toContain("https://arxiv.org/abs/2508.09128");
  expect(source).toContain("https://arxiv.org/abs/2407.05560");
  expect(source).toContain("### Causality in robotics {#causality-in-robotics}");
  expect(source).not.toContain("<details");
  expect(source).not.toContain("05b-rl-review-papers.md");
  expect(source).not.toContain("117 checked reviews");
  expect(source).not.toContain("page:skip");
  expect(source).not.toContain("noindex: true");
});

test("RL body follows the authored overview groups and subtopic order", () => {
  const source = readFileSync(
    new URL("../site/reinforcement-learning/index.md", import.meta.url),
    "utf8"
  );
  const overview = source.split("## Areas of interest\n")[1].split("## Start here")[0];
  const groups = [
    ...overview.matchAll(
      /^- \*\*\[([^\]]+)\]\(#([^)]+)\)\*\*\n([\s\S]*?)(?=^- \*\*|(?![\s\S]))/gmu
    ),
  ];
  let previous = source.indexOf("## Start here");
  for (const [, title, id, nested] of groups) {
    const position = source.indexOf(`## ${title} {#${id}}`);
    expect(position).toBeGreaterThan(previous);
    const end = source.indexOf("\n## ", position + 1);
    const section = source.slice(position, end < 0 ? undefined : end);
    const labels = [...nested.matchAll(/^  - (.+)$/gmu)].map((match) => match[1].toLowerCase());
    const headings = [...section.matchAll(/^### (.+?)(?: \{#[^}]+\})?$/gmu)].map((match) =>
      match[1].toLowerCase()
    );
    expect(headings).toEqual(labels);
    previous = position;
  }
  expect(groups.map((group) => group[1])).toEqual([
    "Problem formulation",
    "Safety and trust",
    "Continual adaptation on real robots",
    "Temporal abstraction and credit assignment",
  ]);
  expect(source).not.toContain("## Learning on real systems");
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
  ["reinforcement-learning", 13, 4],
  ["neuro-ai", 14, 4],
  ["bio-inspired", 15, 5],
  ["ai-for-science", 14, 6],
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

test("AI for science preserves all 157 supplied links without internal build notes", () => {
  const source = readFileSync(new URL("../site/ai-for-science/index.md", import.meta.url), "utf8");
  expect(source).toContain("permalink: /ai-for-science/index.html");
  expect(source).toContain("status: published");
  expect(source.match(/^- \[[^\]]+\]\(https?:\/\/[^)]+\)/gmu)).toHaveLength(157);
  expect(source).not.toContain("page:skip");
  expect(source).not.toContain("_work/");
  expect(source).not.toContain("noindex: true");
});

test("shared public navigation is generated from the same editable-page registry", () => {
  const source = readFileSync(new URL("../site/_includes/public.njk", import.meta.url), "utf8");
  const env = new nunjucks.Environment(new nunjucks.FileSystemLoader("site/_includes"), {
    autoescape: true,
  });
  const html = env.renderString(source.replace(/^---[\s\S]*?---/u, ""), {
    pageKind: "aiscience",
    preview: true,
    content: "<h1>AI for science interests</h1>",
    researchReadingPages,
    researchReadingPageKinds,
  });
  const home = html.search(/>\s*Jay Ranpariya\s*<\/a\s*>/u);
  const index = html.search(/>\s*Index\s*<\/a\s*>/u);
  expect(home).toBeGreaterThan(-1);
  let previous = home;
  for (const page of researchReadingPages) {
    const position = html.search(new RegExp(`>\\s*${page.label}\\s*</a\\s*>`));
    expect(position).toBeGreaterThan(previous);
    expect(html).toContain(`href="${page.route}"`);
    previous = position;
  }
  expect(index).toBeGreaterThan(previous);
  expect(html).toMatch(/href="\/ai-for-science\/"\s+aria-current="page"/);
  expect(html).not.toMatch(/>\s*Research\s*<\/a\s*>/u);
  expect(html.match(/href="\/"/gu)).toHaveLength(1);
});

test.each(researchReadingPages.map((page) => page.slug))(
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
