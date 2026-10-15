import { readFileSync } from "node:fs";
import { copyResearchMedia } from "./lib/research-media.mjs";
import { noteHtml, parseNote } from "./lib/note-authoring.mjs";
import { loadPublicNotes } from "./lib/public-notes.mjs";
import { researchReadingPages, researchReadingPageKinds } from "./lib/reading-pages.mjs";

export default async function configureResearchSite(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ public: "/" });
  eleventyConfig.addPassthroughCopy({ "../../assets/js/codex-notes.js": "/assets/codex-notes.js" });
  const notes = await loadPublicNotes();
  const home = readFileSync(new URL("./content/research-home.md", import.meta.url), "utf8");
  const routes = [
    { slug: "research", url: "/", title: home.match(/^#\s+(.+)$/m)?.[1], body: home },
    ...notes,
  ];
  for (const page of researchReadingPages) {
    const { body } = parseNote(readFileSync(page.path.replace("apps/research/", ""), "utf8"));
    routes.push({ slug: page.slug, url: page.route, title: page.label, body });
  }
  const homeHtml = noteHtml(home, {}, routes);
  for (const note of notes) note.html = noteHtml(note.body, note, routes);
  // Eleventy owns the page HTML; one Markdown renderer also serves admin drafts.
  eleventyConfig.setLibrary("md", { render: (source) => noteHtml(source, {}, routes) });
  copyResearchMedia(
    eleventyConfig,
    [homeHtml, ...routes.map((note) => noteHtml(note.body, note, routes))].join("\n")
  );
  eleventyConfig.addTransform("xml-declaration", (content, outputPath) =>
    outputPath?.endsWith(".xml") ? content.trimStart() : content
  );
  eleventyConfig.addGlobalData("researchHomeHtml", homeHtml);
  eleventyConfig.addGlobalData(
    "researchNoteRoutes",
    JSON.stringify(routes.map(({ slug, url }) => ({ slug, url }))).replaceAll("<", "\\u003c")
  );
  eleventyConfig.addGlobalData("researchNotes", notes);
  eleventyConfig.addGlobalData("researchReadingPages", researchReadingPages);
  eleventyConfig.addGlobalData("researchReadingPageKinds", researchReadingPageKinds);
  eleventyConfig.addCollection("publicPages", (collection) =>
    collection
      .getAll()
      .filter((page) => page.data.canonical && !page.data.noindex && !page.data.pagination)
  );

  return {
    dir: { input: "site", output: "_site", includes: "_includes" },
    templateFormats: ["njk", "md"],
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk",
  };
}
