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
