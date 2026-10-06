import MarkdownIt from "markdown-it";
import { load } from "js-yaml";

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
