import MarkdownIt from "markdown-it";
import { load } from "js-yaml";
import { photoGallery } from "../../../scripts/photo-gallery.mjs";
import { explicitAutoLinks } from "../../../scripts/markdown-links.mjs";

export const researchContentRoot = "apps/research/content";
export function researchRoute(path) {
  const relative = path.slice(researchContentRoot.length + 1);
  if (
    !path.startsWith(`${researchContentRoot}/`) ||
    !/^(?:[a-zA-Z0-9][a-zA-Z0-9_-]*\/)*[a-zA-Z0-9][a-zA-Z0-9_-]*\.md$/.test(relative)
  )
    throw new Error("Invalid research source path.");
  if (relative === "research-home.md") return "/";
  const stem = relative.replace(/\.md$/, "").replace(/(?:^|\/)index$/, "");
  return `/notes/${stem ? `${stem}/` : ""}`;
}

export function parseNote(source) {
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  const data = match ? load(match[1]) || {} : {};
  if (typeof data !== "object" || Array.isArray(data))
    throw new Error("Frontmatter must be a YAML mapping.");
  return { data, body: match ? source.slice(match[0].length) : source };
}

const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
const md = new MarkdownIt({ html: false, linkify: true });
md.use(explicitAutoLinks);
md.use(photoGallery);
const linkOpen = md.renderer.rules.link_open;
md.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index];
  const href = token.attrGet("href") || "";
  if (/^https?:\/\//i.test(href) && !href.startsWith("https://research.jdranpariya.com/")) {
    token.attrSet("target", "_blank");
    token.attrSet("rel", "noopener noreferrer");
    token.attrJoin("class", "research-outbound-link");
  }
  return linkOpen
    ? linkOpen(tokens, index, options, env, self)
    : self.renderToken(tokens, index, options);
};

// Preserve authored anchors without imposing any document structure.
md.core.ruler.before("inline", "explicit-heading-ids", (state) => {
  state.tokens.forEach((token, index) => {
    if (token.type !== "heading_open") return;
    const inline = state.tokens[index + 1];
    const id = inline?.content.match(/\s+\{#([a-zA-Z0-9_-]+)\}\s*$/);
    if (!id) return;
    token.attrSet("id", id[1]);
    inline.content = inline.content.slice(0, id.index).trimEnd();
  });
});

// A final attribution line in a Markdown quote keeps the existing cite style.
md.core.ruler.after("inline", "quote-attributions", (state) => {
  const quotes = [];
  for (const token of state.tokens) {
    if (token.type === "blockquote_open") quotes.push(token);
    if (token.type === "blockquote_close") quotes.pop();
    if (token.type !== "inline" || !quotes.length) continue;
    const children = token.children || [];
    const last = children.at(-1);
    const previous = children.at(-2);
    const attribution = last?.type === "text" && last.content.match(/^—\s+(.+)$/);
    if (!attribution || previous?.type !== "softbreak") continue;
    const cite = new state.Token("html_inline", "", 0);
    cite.content = `<cite>${escape(attribution[1])}</cite>`;
    children.splice(-2, 2, cite);
    quotes.at(-1).attrJoin("class", "research-quote");
  }
});

// Both the live site and the admin preview use this renderer. No source HTML or
// executable templates are accepted, and unresolved wiki links remain plain text.
export function noteHtml(body, note, notes = []) {
  const prepared = body.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, reference, label) => {
    const target = notes.find(
      (item) => item.slug === reference || item.title.toLowerCase() === reference.toLowerCase()
    );
    const text = String(label || target?.title || reference).replace(/[\\\[\]]/g, "\\$&");
    return target ? `[${text}](${target.url})` : text;
  });
  const children = note.folderIndex
    ? notes
        .filter((child) => {
          if (child.path === note.path) return false;
          const container = child.path.replace(/\/index\.md$/, "").replace(/\/[^/]+$/, "");
          return container === note.path.replace(/\/index\.md$/, "");
        })
        .sort((a, b) => a.title.localeCompare(b.title))
    : [];
  return (
    md.render(prepared) +
    (children.length
      ? `<nav aria-label="Pages in this folder"><ul>${children.map((child) => `<li><a href="${escape(child.url)}">${escape(child.title)}</a></li>`).join("")}</ul></nav>`
      : "")
  );
}
