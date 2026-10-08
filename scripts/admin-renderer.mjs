import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import footnote from "markdown-it-footnote";
import callouts from "markdown-it-obsidian-callouts";
import tasks from "markdown-it-task-lists";
import container from "markdown-it-container";
import katex from "@vscode/markdown-it-katex";
import { load } from "js-yaml";
import { parseResearchHome } from "../apps/research/lib/research-home.ts";
import {
  sourceDirectories,
  creationPath,
  sourceUrl,
  documentSection,
  newDocument,
} from "./admin-authoring.mjs";
import { folderChildren } from "./folder-index.mjs";
import { noteHtml, researchRoute } from "../apps/research/lib/note-authoring.mjs";
import { photoGallery } from "./photo-gallery.mjs";
import { explicitAutoLinks } from "./markdown-links.mjs";

export const escapeHtml = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

export function parseDocument(source) {
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  const frontmatter = match ? load(match[1]) || {} : {};
  if (typeof frontmatter !== "object" || Array.isArray(frontmatter))
    throw new Error("Frontmatter must be a YAML mapping.");
  return { frontmatter, body: match ? source.slice(match[0].length) : source };
}

export function titleCase(value) {
  const small = new Set(
    "a an and as at but by for in nor of on or so the to up yet with vs via".split(" ")
  );
  const acronyms = new Set("ai rl pid nmpc lqr mpc vlms llms gpu cpu cad ar vr".split(" "));
  const words = String(value || "").split(/(\s+)/);
  const indexes = words.map((word, i) => (/\S/.test(word) ? i : -1)).filter((i) => i >= 0);
  return words
    .map((word, i) => {
      if (!/\S/.test(word) || /^[A-Z0-9]{2,}$/.test(word)) return word;
      const lower = word.toLowerCase();
      if (lower === "neuroai") return "NeuroAI";
      if (acronyms.has(lower)) return word.toUpperCase();
      if (i !== indexes[0] && i !== indexes.at(-1) && small.has(lower.replace(/[^a-z]/g, "")))
        return lower;
      return lower.replace(/[a-z]/, (c) => c.toUpperCase());
    })
    .join("");
}

const md = new MarkdownIt({ html: true, linkify: true })
  .use(explicitAutoLinks)
  .use(anchor, { permalink: false })
  .use(footnote)
  .use(callouts)
  .use(tasks, { label: true })
  .use(typeof katex === "function" ? katex : katex.default)
  .use(container, "note", {
    render: (tokens, i) =>
      tokens[i].nesting === 1 ? '<blockquote class="subtitle-note">' : "</blockquote>\n",
  })
  .use(container, "references", {
    render: (tokens, i) =>
      tokens[i].nesting === 1
        ? `<details class="references-block"><summary>${escapeHtml(tokens[i].info.trim().slice(10).trim() || "References")}</summary>`
        : "</details>\n",
  });

md.use(photoGallery);

function renderResearch(source) {
  const doc = parseResearchHome(source);
  // The public research homepage uses this same parser and paragraph/theme structure.
  const inline = (text) =>
    md.renderInline(
      text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, name, label) => label || name)
    );
  const blocks = (text) =>
    text
      .split(/(::: gallery\s*\n[\s\S]*?\n:::)/g)
      .map((part) => (part.startsWith("::: gallery") ? md.render(part) : inline(part)))
      .join("");
  return `<div class="research-root-note"><header class="research-intro"><h1>${escapeHtml(doc.title)}</h1>${doc.introduction.map((p) => (p.startsWith("::: gallery") ? md.render(p) : `<p>${inline(p)}</p>`)).join("")}${doc.quote ? `<blockquote class="research-quote"><p>${escapeHtml(doc.quote.text)}</p><cite>${escapeHtml(doc.quote.attribution)}</cite></blockquote>` : ""}</header><ul class="theme-list">${doc.themes.map((t) => `<li><strong>${escapeHtml(t.title)}</strong>: ${blocks(t.questions)}</li>`).join("")}</ul></div>`;
}

export function renderDocument(source, path, files = []) {
  if (path === "apps/research/content/research-home.md")
    return { html: renderResearch(source), research: true, frontmatter: {}, warnings: [] };
  const { frontmatter, body } = parseDocument(source);
  if (path.startsWith("apps/research/content/")) {
    const notes = files
      .filter(
        (file) =>
          file.path.startsWith("apps/research/content/") && !file.path.endsWith("/research-home.md")
      )
      .map((file) => ({
        path: file.path,
        url: researchRoute(file.path),
        slug: file.path
          .slice("apps/research/content/".length)
          .replace(/\.md$/, "")
          .replace(/\/index$/, ""),
        title: file.frontmatter?.title || file.path.split("/").at(-1).replace(/\.md$/, ""),
        folderIndex: file.frontmatter?.folderIndex === true,
      }));
    const note = {
      path,
      title: frontmatter.title || "",
      folderIndex: frontmatter.folderIndex === true,
    };
    return {
      html: `<div class="research-note-content"><h1>${escapeHtml(note.title)}</h1><div class="research-note-body">${noteHtml(body, note, notes)}</div></div>`,
      frontmatter,
      research: true,
      warnings: [],
    };
  }
  const warnings = [];
  const prepared = body.replace(
    /{%\s*image\s+["']([^"']+)["']\s*,?\s*["']([^"']*)["'][\s\S]*?%}/g,
    (_, src, alt) =>
      `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" data-preview-image="true">`
  );
  if (/{[%{]/.test(prepared) || /^::: interactive/m.test(prepared))
    warnings.push(
      "Template logic and interactive demos require the site build. Use the published-page link to check those."
    );
  const date = (value) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.valueOf())) return "";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(parsed);
  };
  const hero = frontmatter.folderIndex
    ? `<header class="post-hero"><h1 class="post-hero__title">${escapeHtml(titleCase(frontmatter.title))}</h1>${frontmatter.description ? `<p class="post-hero__lead">${escapeHtml(frontmatter.description)}</p>` : ""}</header>`
    : frontmatter.title
      ? `<header class="post-hero"><h1 class="post-hero__title">${escapeHtml(titleCase(frontmatter.title))}</h1>${frontmatter.description ? `<p class="post-hero__lead">${escapeHtml(frontmatter.description)}</p>` : ""}<p class="post-hero__meta">${date(frontmatter.published)}${frontmatter.lastUpdated && date(frontmatter.lastUpdated) !== date(frontmatter.published) ? ` · Updated ${date(frontmatter.lastUpdated)}` : ""}</p><hr class="post-hero__divider"></header>`
      : "";
  const children = frontmatter.folderIndex
    ? folderChildren(
        files.map((file) => ({
          ...file,
          inputPath: file.path,
          url: sourceUrl(file.path),
          data: file.frontmatter || {
            title: file.path.split("/").at(-1).replace(/\.md$/, "").replaceAll("-", " "),
          },
        })),
        path,
        true
      )
    : [];
  const index =
    frontmatter.folderIndex && children.length
      ? `<nav aria-label="Pages in this folder"><ul class="index-list">${children.map((child) => `<li><a class="index-row" href="${escapeHtml(child.url)}"><h2 class="index-row__title">${escapeHtml(titleCase(child.data.title))}</h2></a></li>`).join("")}</ul></nav>`
      : "";
  return {
    html: `${hero}<div class="prose-site">${md.render(prepared)}</div>${index}`,
    bodyHtml: md.render(prepared),
    frontmatter,
    research: false,
    warnings,
  };
}

export function buildFileTree(files, query = "") {
  const root = { directories: new Map(), files: [] };
  for (const file of files) {
    if (
      query &&
      !file.path
        .toLowerCase()
        .replaceAll("-", " ")
        .includes(query.toLowerCase().replaceAll("-", " "))
    )
      continue;
    const personal = file.path.startsWith("src/");
    const parts = [
      personal ? "Personal site" : "Research site",
      ...file.path.slice(personal ? 4 : "apps/research/content/".length).split("/"),
    ];
    let node = root;
    let key = "";
    let sourcePath = personal ? "src" : "apps/research/content";
    for (const part of parts.slice(0, -1)) {
      key += `${key ? "/" : ""}${part}`;
      if (key.includes("/")) sourcePath += `/${part}`;
      if (!node.directories.has(part))
        node.directories.set(part, {
          name: part,
          key,
          path: sourcePath,
          directories: new Map(),
          files: [],
        });
      node = node.directories.get(part);
    }
    node.files.push(file);
  }
  return root;
}

if (typeof window !== "undefined")
  window.AdminRenderer = {
    renderDocument,
    parseDocument,
    buildFileTree,
    sourceDirectories,
    creationPath,
    sourceUrl,
    documentSection,
    newDocument,
  };
