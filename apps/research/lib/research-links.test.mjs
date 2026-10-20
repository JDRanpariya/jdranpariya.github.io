import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import postcss from "postcss";

test("research prose links are red and underlined at rest in documents and note panes", () => {
  const css = postcss.parse(
    readFileSync(new URL("../client/research.css", import.meta.url), "utf8")
  );
  for (const selector of [
    ".research-note-body a",
    ".research-reading-body a",
    ".research-note-content a",
  ]) {
    const declarations = {};
    css.walkRules((rule) => {
      if (rule.selectors.includes(selector)) {
        rule.walkDecls((decl) => {
          declarations[decl.prop] = decl.value;
        });
      }
    });
    expect(declarations.color).toBe("var(--accent)");
    expect(declarations["text-decoration-line"]).toBe("underline");
    expect(declarations["text-decoration-color"]).toBe("var(--accent)");
  }
});

test("only an Areas of interest list loses its outer bullets", () => {
  const css = readFileSync(new URL("../client/research.css", import.meta.url), "utf8");
  expect(css).toContain(".research-interest-overview > h2#areas-of-interest + ul");
  expect(css).not.toContain(".research-interest-overview > ul:first-of-type");
  expect(css).toContain(".research-reading-body ul");
  expect(css).toContain(
    "@apply my-6 grid grid-cols-1 items-start gap-x-10 gap-y-6 list-none pl-0 sm:grid-cols-2;"
  );
});
