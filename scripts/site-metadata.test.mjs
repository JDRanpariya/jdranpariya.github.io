import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import nunjucks from "nunjucks";
import { jsonForScript, jsonLdScript, metadataFor } from "./site-metadata.mjs";

const site = JSON.parse(readFileSync(new URL("../src/_data/site.json", import.meta.url)));

describe("shared site metadata", () => {
  test("home and about use the shared writing-and-society description", () => {
    for (const section of ["home", "about"]) {
      const metadata = metadataFor({ section }, site);
      expect(metadata.description).toBe(site.description);
      expect(metadata.structuredData.description).toBe(site.description);
      expect(metadata.siteName).toBe(site.name);
      expect(JSON.stringify(metadata)).not.toContain("JD Ranpariya");
    }
  });

  test("page descriptions override defaults without changing the page body", () => {
    const metadata = metadataFor(
      { section: "writings", description: "Jay's words, not a generic bio." },
      site
    );
    expect(metadata.description).toBe("Jay's words, not a generic bio.");
    expect(metadata.structuredData.description).toBe(metadata.description);
  });

  test("missing descriptions use relevant section or paper metadata", () => {
    for (const section of Object.keys(site.sectionDescriptions)) {
      expect(metadataFor({ section }, site).description).toBe(site.sectionDescriptions[section]);
    }
    const paper = metadataFor(
      { section: "papers", title: "More Is Different", author: "P. W. Anderson" },
      site
    );
    expect(paper.description).toBe("Reading notes on More Is Different, by P. W. Anderson.");
    expect(paper.structuredData.description).toBe(paper.description);
  });

  test("does not infer employment or graduation status", () => {
    const person = metadataFor({ section: "about" }, site).structuredData;
    expect(person.jobTitle).toBeUndefined();
    expect(person.alumniOf).toBeUndefined();
    expect(person.sameAs).toEqual(site.sameAs);
  });

  test("extensionless post layouts use the generated per-post social images", () => {
    const book = metadataFor(
      {
        section: "books",
        layout: "layouts/post",
        page: { url: "/library/books/test/", fileSlug: "test" },
      },
      site
    );
    expect(book.type).toBe("article");
    expect(book.image).toBe(`${site.url}/assets/og/book-test.png`);
  });

  test("research shares identity but keeps its own description and canonical", () => {
    const metadata = metadataFor(
      {
        title: "RL",
        canonical: `${site.research.url}/reinforcement-learning/`,
        description: "RL reading list.",
      },
      site,
      { research: true }
    );
    expect(metadata.siteName).toBe(`${site.name} · Research`);
    expect(metadata.url).toBe(`${site.research.url}/reinforcement-learning/`);
    expect(metadata.image).toBe(`${site.url}${site.image.path}`);
    expect(metadata.description).toBe("RL reading list.");
    expect(metadata.title).toBe(`RL · ${site.name}`);
  });

  test("JSON-LD survives quotes, apostrophes, and HTML without escaping into entities", () => {
    const value = { description: 'Jay\'s "ideas" & </script><script>alert(1)</script>\u2028' };
    const env = new nunjucks.Environment(null, { autoescape: true });
    env.addFilter("jsonForScript", jsonForScript);
    const rendered = env.renderString("{{ value | jsonForScript | safe }}", { value });
    expect(JSON.parse(rendered)).toEqual(value);
    expect(rendered).not.toContain("</script>");
    expect(rendered).not.toContain("&#39;");
    expect(rendered).not.toContain("&quot;");
    expect(jsonLdScript(value)).toBe(`<script type="application/ld+json">${rendered}</script>`);
  });
});
