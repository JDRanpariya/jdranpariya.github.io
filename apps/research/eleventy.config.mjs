import { readFileSync } from "node:fs";
import { copyResearchMedia } from "./lib/research-media.mjs";

export default function configureResearchSite(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ public: "/" });
  const homeHtml = readFileSync(new URL("./.cache/research-home.html", import.meta.url), "utf8");
  const notes = JSON.parse(
    readFileSync(new URL("./.cache/research-notes.json", import.meta.url), "utf8")
  );
  copyResearchMedia(
    eleventyConfig,
    [homeHtml, ...notes.map((note) => note.pageHtml || note.html || "")].join("\n")
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

  return {
    dir: { input: "site", output: "_site", includes: "_includes" },
    templateFormats: ["njk"],
    htmlTemplateEngine: "njk",
  };
}
