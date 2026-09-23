import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isValidElement, type ReactElement } from "react";
import { renderInline } from "./research-notes";
import type { ResearchTheme } from "@/lib/research-home";

const theme: ResearchTheme = {
  slug: "learning-simulation-world-models",
  title: "Learning, simulation, and world models",
  questions: "",
};
const themes = new Map([[theme.slug, theme]]);

function firstLink(markdown: string) {
  const link = renderInline(markdown, themes).find(isValidElement);
  if (!link) throw new Error(`No link rendered for ${markdown}`);
  return link as ReactElement<{
    children: string;
    href: string;
    target?: string;
  }>;
}

describe("research note links", () => {
  it("wikilinks resolve slugs and visible titles", () => {
    const bySlug = firstLink("[[learning-simulation-world-models]]");
    const byTitle = firstLink("[[Learning, simulation, and world models|related question]]");

    assert.equal(bySlug.props.href, "/?notes=learning-simulation-world-models");
    assert.equal(bySlug.props.children, theme.title);
    assert.equal(byTitle.props.href, bySlug.props.href);
    assert.equal(byTitle.props.children, "related question");
  });

  it("Markdown note links resolve to pane URLs", () => {
    assert.equal(
      firstLink("[related](note:learning-simulation-world-models)").props.href,
      "/?notes=learning-simulation-world-models"
    );
    assert.equal(
      firstLink("[related](/?notes=learning-simulation-world-models)").props.href,
      "/?notes=learning-simulation-world-models"
    );
  });

  it("external links stay external", () => {
    const link = firstLink("[paper](https://example.com/paper)");
    assert.equal(link.props.href, "https://example.com/paper");
    assert.equal(link.props.target, "_blank");
  });
});
