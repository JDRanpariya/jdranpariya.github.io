import { readFile, readdir, mkdir, writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import Image from "@11ty/eleventy-img";
import postcss from "postcss";
import tailwind from "tailwindcss";
import config from "../tailwind.config.js";
import nunjucks from "nunjucks";
import { createHash } from "node:crypto";
import { parseDocument } from "./admin-renderer.mjs";
import { sourceUrl } from "./admin-authoring.mjs";

await mkdir("build/assets/js", { recursive: true });
await mkdir("build/assets/css", { recursive: true });
const result = await Bun.build({
  entrypoints: ["admin/main.jsx"],
  outdir: "build/assets/js",
  naming: "admin-app.js",
  target: "browser",
  format: "iife",
  minify: true,
  define: { "process.env.NODE_ENV": '"production"' },
});
if (!result.success) throw new Error(result.logs.join("\n"));

// Compile the actual research content rules, rather than maintain a third theme.
const research = postcss.parse(await readFile("apps/research/client/research.css", "utf8"));
const shared = postcss.root();
function collectRules(container, target) {
  for (const node of container.nodes || []) {
    if (
      node.type === "rule" &&
      /^\.(research-intro|research-quote|theme-list|research-note-content|research-note-body|photo-gallery)/.test(
        node.selector
      )
    ) {
      target.append(node.clone());
    } else if (node.type === "atrule" && node.nodes) {
      if (node.name === "layer") {
        // Layer registration belongs to the site's Tailwind build. Keep its
        // content rules here, without stripping responsive @media wrappers.
        collectRules(node, target);
        continue;
      }
      const branch = node.clone({ nodes: [] });
      collectRules(node, branch);
      if (branch.nodes.length) target.append(branch);
    }
  }
}
collectRules(research, shared);
const css = await postcss([
  tailwind({
    ...config,
    content: [{ raw: "research-intro research-quote theme-list", extension: "html" }],
  }),
]).process(shared.toString(), {
  from: undefined,
});
await writeFile("build/assets/css/admin-research-preview.css", css.css);

// Original source images are not shipped. Reuse the optimized images emitted by
// Eleventy so Markdown previews do not request nonexistent /assets/ originals.
const imageMap = {};
async function indexImages(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      await indexImages(path);
    } else if (/\.(png|jpe?g|webp|avif|gif|svg)$/i.test(entry.name)) {
      try {
        const metadata = Image.statsSync(resolve(path), {
          widths: [400, 800, 1600, null],
          formats: ["avif"],
          outputDir: "./build/img/",
          urlPath: "/img/",
        });
        const url = metadata.avif.at(-1).url;
        await access(`build${url}`);
        imageMap[`/${path}`] = url;
      } catch {
        // Unused images have no build output and should not be generated here.
      }
    }
  }
}
await indexImages("assets/images");
await writeFile("build/assets/admin-image-map.json", JSON.stringify(imageMap));

// Include built template routes too, so newly authored Markdown cannot collide
// with a template-owned route that isn't in the repository editor's file list.
const routes = [];
async function indexRoutes(directory, prefix = "", origin = "") {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await indexRoutes(path, `${prefix}/${entry.name}`, origin);
    else if (entry.name.endsWith(".html"))
      routes.push(
        origin + (entry.name === "index.html" ? `${prefix}/` : `${prefix}/${entry.name}`)
      );
  }
}
await indexRoutes("build");
// Authored Markdown routes are deterministic and do not depend on whether the
// separate research build has already run on this machine.
const { loadPublicNotes } = await import("../apps/research/lib/public-notes.mjs");
routes.push(
  ...(await loadPublicNotes()).map((note) => `https://research.jdranpariya.com${note.url}`)
);
routes.push(
  "https://research.jdranpariya.com/",
  "https://research.jdranpariya.com/index",
  "https://research.jdranpariya.com/library/"
);
await writeFile("build/assets/admin-routes.json", JSON.stringify(routes));

// Precompile the actual Eleventy templates. No eval/new Function is needed in
// the browser, keeping the strict CSP and sandbox intact.
let compiled = "";
for (const name of [
  "layouts/post.njk",
  "layouts/about.njk",
  "layouts/folder.njk",
  "components/nav.njk",
  "components/footer.njk",
  "components/newsletter_form.njk",
  "components/webmentions.njk",
]) {
  const template = (await readFile(`src/_includes/${name}`, "utf8")).replace(
    /^---[\s\S]*?---\s*/,
    ""
  );
  compiled += nunjucks.precompileString(template, { name });
}
const previewPath = "build/assets/admin-preview.html";
const hash = (content) => createHash("sha256").update(content).digest("hex").slice(0, 12);
const stylesHash = hash(await readFile("build/css/style.css"));
const previewHtml = (await readFile(previewPath, "utf8")).replace(
  /\/css\/style\.css(?:\?v=[a-z0-9]+)?/g,
  `/css/style.css?v=${stylesHash}`
);
const versionedPreview = previewHtml.replace(
  "/assets/css/admin-research-preview.css",
  `/assets/css/admin-research-preview.css?v=${hash(await readFile("build/assets/css/admin-research-preview.css"))}`
);
await writeFile(previewPath, versionedPreview);
compiled += `\nwindow.AdminTemplates=window.nunjucksPrecompiled;window.AdminPreview={url:"/assets/admin-preview.html?v=${hash(versionedPreview)}"};\n`;
await writeFile("build/assets/js/admin-templates.js", compiled);
const adminPath = "build/admin/index.html";
let adminHtml = await readFile(adminPath, "utf8");
for (const name of ["admin-templates", "admin-app"])
  adminHtml = adminHtml.replace(
    new RegExp(`/assets/js/${name}\\.js(?:\\?v=[a-z0-9]+)?`, "g"),
    `/assets/js/${name}.js?v=${hash(await readFile(`build/assets/js/${name}.js`))}`
  );
adminHtml = adminHtml.replace(
  /\/css\/style\.css(?:\?v=[a-z0-9]+)?/g,
  `/css/style.css?v=${stylesHash}`
);
await writeFile(adminPath, adminHtml);

const collections = { all: [], tagListMulti: [] };
async function metadataUnder(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith("_") || entry.name === "now") continue;
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await metadataUnder(path);
    else if (entry.name.endsWith(".md")) {
      const { frontmatter: data } = parseDocument(await readFile(path, "utf8"));
      if (!data.title || data.status === "draft") continue;
      const url = data.permalink || sourceUrl(path),
        output = `build${url.endsWith("/") ? `${url}index.html` : url}`;
      try {
        await access(output);
      } catch {
        continue;
      }
      const item = {
        inputPath: path,
        url,
        data: {
          title: data.title,
          description: data.description,
          published: data.published,
          tags: data.tags || [],
          series: data.series,
          section: data.section,
          folderIndex: data.folderIndex,
        },
      };
      collections.all.push(item);
      if (data.section && !data.folderIndex) (collections[data.section] ||= []).push(item);
    }
  }
}
await metadataUnder("src");
for (const items of Object.values(collections))
  items.sort?.((a, b) => new Date(b.data?.published || 0) - new Date(a.data?.published || 0));
const tags = new Map();
for (const item of collections.all)
  for (const tag of item.data.tags) tags.set(tag, (tags.get(tag) || 0) + 1);
collections.tagListMulti = [...tags].filter(([, count]) => count > 1).map(([tag]) => tag);
await writeFile("build/assets/admin-post-data.json", JSON.stringify({ collections }));
