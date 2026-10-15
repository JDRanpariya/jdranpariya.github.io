import { test, expect } from "bun:test";
import nunjucks from "nunjucks";
import { readFileSync } from "node:fs";
import { renderPublicIndex } from "../.cache/public-index.mjs";

const records = [
  {
    collection: "neuroai",
    name: '<script>alert("x")</script>',
    url: "https://example.com/",
    lead: "Lead",
    institution: "ETH",
    country: "CH",
    summary: "Summary",
    publicNotes: "Only published notes",
    tags: ["memory"],
    primary: "AI",
  },
];
test("the Worker uses the identical Nunjucks template with escaped public records", () => {
  const env = new nunjucks.Environment(new nunjucks.FileSystemLoader("site/_includes"), {
    autoescape: true,
  });
  const context = {
    records,
    badges: {
      "great-minds": "Person",
      neuroai: "NeuroAI",
      rl: "Reinforcement learning",
      "bio-inspired": "Bio-inspired",
      "ai-for-science": "AI/ML for science",
    },
  };
  expect(renderPublicIndex(records)).toBe(env.render("components/public-index.njk", context));
  const html = renderPublicIndex(records);
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain("<script>");
  expect(html).toContain("data-index-record");
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).toContain("ETH · CH");
  expect(html).toContain("Only published notes");
});
test("empty selected indexes remain useful without JavaScript and public entries do not load React", () => {
  const html = renderPublicIndex([]);
  expect(html).toContain("No entries published yet.");
  expect(html).not.toContain("index-tools");
  const script = readFileSync("client/index.ts", "utf8");
  expect(script).not.toContain("react");
  expect(script).toContain("row.hidden");
});

test("every publishable collection has an index filter", () => {
  const html = renderPublicIndex(records);
  for (const collection of ["great-minds", "neuroai", "rl", "bio-inspired", "ai-for-science"]) {
    expect(html).toContain(`data-index-filter="${collection}"`);
  }
});
