import { readFile, readdir, mkdir, writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import Image from "@11ty/eleventy-img";
import postcss from "postcss";
import tailwind from "tailwindcss";
import config from "../tailwind.config.js";

await mkdir("build/assets/js", { recursive: true });
await mkdir("build/assets/css", { recursive: true });
const result = await Bun.build({
  entrypoints: ["scripts/admin-renderer.mjs"],
  outdir: "build/assets/js",
  naming: "admin-renderer.js",
  target: "browser",
  format: "iife",
  minify: true,
});
if (!result.success) throw new Error(result.logs.join("\n"));

// Compile the actual research content rules, rather than maintain a third theme.
const research = postcss.parse(await readFile("apps/research/client/research.css", "utf8"));
const shared = [];
research.walkRules((rule) => {
  if (
    /^\.(research-intro|research-quote|theme-list|research-note-content|research-note-body)/.test(
      rule.selector
    )
  )
    shared.push(rule.toString());
});
const css = await postcss([
  tailwind({
    ...config,
    content: [{ raw: "research-intro research-quote theme-list", extension: "html" }],
  }),
]).process(shared.join("\n"), {
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

// Include built template routes too, so e.g. a new about/index.md cannot collide
// with about.njk (which is not listed by the Markdown-only repository API).
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
