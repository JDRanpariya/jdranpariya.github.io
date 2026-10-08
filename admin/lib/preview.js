import nunjucks from "nunjucks/browser/nunjucks-slim.js";
import { titleCase } from "../../scripts/admin-renderer.mjs";
import { folderChildren } from "../../scripts/folder-index.mjs";
import BuildList from "eleventy-plugin-toc/src/BuildList.js";

export function templateEnvironment(templates) {
  const env = new nunjucks.Environment(new nunjucks.PrecompiledLoader(templates), {
    autoescape: true,
  });
  env.addFilter("smartTitleCase", titleCase);
  env.addFilter("isoDate", (value) => (value ? new Date(value).toISOString().slice(0, 10) : ""));
  env.addFilter("formatDate", (value) =>
    value
      ? new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(value))
      : ""
  );
  env.addFilter("cacheBust", () => "");
  env.addFilter("slug", (value) =>
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
  env.addFilter("folderChildren", (files, path) => folderChildren(files, path, true));
  env.addFilter("relatedPosts", (collection = [], url, tags = [], series, readNext, all) => {
    if (readNext) {
      const match = (all || collection).find((item) => item.url === readNext);
      if (match) return [match];
    }
    const scored = collection
      .filter((item) => item.url !== url)
      .map((item) => {
        const theirs = new Set(item.data.tags || []),
          ours = new Set(tags);
        const intersection = [...ours].filter((tag) => theirs.has(tag)).length;
        const union = new Set([...ours, ...theirs]).size;
        let score = union ? intersection / union : 0;
        if (series?.name && item.data.series?.name === series.name)
          score += 1 + (series.order && item.data.series.order === series.order + 1 ? 0.5 : 0);
        return { item, score };
      })
      .filter((item) => item.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          new Date(b.item.data.published || 0) - new Date(a.item.data.published || 0)
      );
    return scored.length ? [scored[0].item] : [];
  });
  env.addFilter("toc", (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const items = [];
    const headings = [...doc.querySelectorAll("h2[id],h3[id]")];
    for (const [order, heading] of headings.entries()) {
      const item = {
        id: heading.id,
        text: heading.textContent.replace(" #", ""),
        order,
        children: [],
      };
      let sibling = heading.previousElementSibling;
      if (heading.tagName === "H3")
        while (sibling && sibling.tagName !== "H2") sibling = sibling.previousElementSibling;
      const parent =
        heading.tagName === "H3" && sibling
          ? items.find((parent) => parent.id === sibling.id)
          : null;
      (parent ? parent.children : items).push(item);
    }
    return items.length ? `<nav class="toc-list">${BuildList(items, false, false)}</nav>` : "";
  });
  return env;
}

export function renderPage(env, result, path, files, manifest) {
  if (result.research) return result.html;
  const data = result.frontmatter;
  const collections = { ...manifest.collections };
  if (data.folderIndex)
    collections.all = files.map((file) => ({
      inputPath: file.path,
      url: file.url,
      data: file.frontmatter || { title: file.path.split("/").at(-1).replace(/\.md$/, "") },
    }));
  const context = {
    ...data,
    content: result.bodyHtml,
    page: { url: data.permalink || `/${path.slice(4).replace(/\.md$/, "")}/`, inputPath: path },
    collections,
    webmentions: {},
  };
  const layout =
    data.layout === "layouts/about.njk"
      ? "layouts/about.njk"
      : data.folderIndex
        ? "layouts/folder.njk"
        : "layouts/post.njk";
  return (
    env.render("components/nav.njk", context) +
    `<main id="main">${env.render(layout, context)}</main>` +
    env.render("components/footer.njk", context)
  );
}

export function sanitizePreview(html, imageMap = {}) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc
    .querySelectorAll("script,iframe,object,embed,meta,link,base,style,foreignObject")
    .forEach((node) => node.remove());
  doc.querySelectorAll("*").forEach((node) => {
    for (const attr of [...node.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || ["srcdoc", "formaction", "action"].includes(name))
        node.removeAttribute(attr.name);
      if (["href", "src", "xlink:href", "srcset"].includes(name)) {
        if (name === "srcset") {
          node.removeAttribute(name);
          continue;
        }
        let value = attr.value.trim();
        if (name === "src")
          value =
            imageMap[
              value.replace(/^https:\/\/jdranpariya\.com/, "").replace(/^assets\//, "/assets/")
            ] || value;
        const allowed =
          name === "src"
            ? /^(?:\/[^/]|https:\/\/jdranpariya\.com\/|blob:|data:image\/(?:jpeg|png|webp|avif);)/.test(
                value
              )
            : /^(?:\/|#|https?:|mailto:)/.test(value);
        if (!allowed) node.removeAttribute(name);
        else node.setAttribute(name, value);
      }
    }
    if (["INPUT", "BUTTON", "SELECT", "TEXTAREA", "FORM"].includes(node.tagName))
      node.setAttribute("inert", "");
  });
  return doc.body.innerHTML;
}
