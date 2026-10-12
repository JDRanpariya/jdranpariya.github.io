import { readFileSync } from "node:fs";
import { copyResearchMedia } from "./lib/research-media.mjs";
import { researchMarkdown } from "./lib/note-authoring.mjs";
import { researchReadingPages, researchReadingPageKinds } from "./lib/reading-pages.mjs";

export default function configureResearchSite(eleventyConfig) {
  eleventyConfig.setLibrary("md", researchMarkdown);
  eleventyConfig.addPassthroughCopy({ public: "/" });
  const homeHtml = readFileSync(new URL("./.cache/research-home.html", import.meta.url), "utf8");
  const notes = JSON.parse(
    readFileSync(new URL("./.cache/research-notes.json", import.meta.url), "utf8")
  );
  const readingDocuments = JSON.parse(
    readFileSync(new URL("./.cache/research-reading-pages.json", import.meta.url), "utf8")
  );
  copyResearchMedia(
    eleventyConfig,
    [
      homeHtml,
      ...notes.map((note) => note.pageHtml || note.html || ""),
      ...Object.values(readingDocuments).map((document) => document.pageHtml),
    ].join("\n")
  );
  eleventyConfig.addTransform("xml-declaration", (content, outputPath) =>
    outputPath?.endsWith(".xml") ? content.trimStart() : content
  );
  eleventyConfig.addGlobalData("researchHomeHtml", homeHtml);
  eleventyConfig.addGlobalData(
    "researchHomeJson",
    readFileSync(new URL("./.cache/research-home.json", import.meta.url), "utf8")
  );
  eleventyConfig.addGlobalData("researchNotes", notes);
  eleventyConfig.addGlobalData("researchReadingDocuments", readingDocuments);
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
