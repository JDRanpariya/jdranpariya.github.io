import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isValidElement, type ReactElement } from "react";
import { renderInline, ResearchNotes } from "./research-notes";
import { parseResearchHome, renderResearchHome, type ResearchNote } from "@/lib/research-home";
import { renderToString } from "react-dom/server";

const note: ResearchNote = {
  slug: "learning-simulation-world-models",
  title: "Learning, simulation, and world models",
  body: "",
};
const notes = new Map([[note.slug, note]]);

function firstLink(markdown: string) {
  const link = renderInline(markdown, notes).find(isValidElement);
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
    assert.equal(bySlug.props.children, note.title);
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

  it("canonical note links resolve natively without treating the research hostname as external", () => {
    const authored = { ...note, url: "/notes/learning/world-models/" };
    const notes = new Map([[authored.slug, authored]]);
    for (const href of [authored.url, `https://research.jdranpariya.com${authored.url}`]) {
      const link = renderInline(`[Related](${href})`, notes).find(isValidElement) as ReactElement<{
        href: string;
        target?: string;
      }>;
      assert.equal(link.props.href, authored.url);
      assert.equal(link.props.target, undefined);
    }
  });
});

describe("research homepage content", () => {
  it("renders headings as Markdown without creating note pages or artificial bullets", () => {
    const document = parseResearchHome(
      "# Research\n\n## Example theme {#example-theme}\n\nA question worth keeping?"
    );
    const html = renderResearchHome(document);
    assert.ok(html.includes('<h2 id="example-theme">Example theme</h2>'));
    assert.ok(html.includes("<p>A question worth keeping?</p>"));
    assert.ok(!html.includes("<li>"));
    assert.deepEqual(document.notes, []);
    assert.equal(
      renderInline("[[example-theme|demo note]]", new Map(document.notes)).join(""),
      "demo note"
    );
  });

  it("keeps normal blocks, paragraphs and the final italic note in document order", () => {
    const source =
      "# Research\n\n## Learning {#learning}\n\nQuestion?\n\n- One\n- Two\n\n*My closing note.*\n\n---\n\n### A plain heading\n\n**Bold** and `code`.";
    const doc = parseResearchHome(source);
    assert.equal(doc.body, source);
    const html = renderResearchHome(doc);
    assert.ok(html.includes("</ul>\n<p><em>My closing note.</em></p>"));
    assert.ok(html.includes("<hr>"));
    assert.ok(html.includes("<h3>A plain heading</h3>"));
    assert.ok(html.includes("<strong>Bold</strong> and <code>code</code>"));
    const page = renderToString(
      <ResearchNotes initialDocument={doc} initialFocus={0} initialPath={[]} />
    );
    assert.ok(page.includes(html));
    assert.ok(!page.includes('class="theme-list"'));
  });

  it("uses canonical note links and escapes untrusted source HTML", () => {
    const doc = parseResearchHome(
      "# Research\n\n[[memory|Memory]]\n\n<script>alert(1)</script>\n\n[Bad](javascript:alert(1))\n\n> Quote\n> — <img src=x onerror=alert(1)>"
    );
    doc.notes = [{ slug: "memory", title: "Memory", body: "", url: "/notes/memory/" }];
    const html = renderResearchHome(doc);
    assert.ok(html.includes('href="/notes/memory/"'));
    assert.ok(!html.includes("<script>"));
    assert.ok(!html.includes('href="javascript:'));
    assert.ok(html.includes("<cite>&lt;img src=x onerror=alert(1)&gt;</cite>"));
  });
});
