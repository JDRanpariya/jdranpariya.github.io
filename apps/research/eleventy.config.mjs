import { readFileSync } from "node:fs";

export default function configureResearchSite(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ public: "/" });
  eleventyConfig.addTransform("xml-declaration", (content, outputPath) =>
    outputPath?.endsWith(".xml") ? content.trimStart() : content
  );
  eleventyConfig.addGlobalData(
    "researchHomeHtml",
    readFileSync(new URL("./.cache/research-home.html", import.meta.url), "utf8")
  );
  eleventyConfig.addGlobalData(
    "researchHomeJson",
    readFileSync(new URL("./.cache/research-home.json", import.meta.url), "utf8")
  );
  eleventyConfig.addGlobalData(
    "researchNotes",
    JSON.parse(readFileSync(new URL("./.cache/research-notes.json", import.meta.url), "utf8"))
  );

  return {
    dir: { input: "site", output: "_site", includes: "_includes" },
    templateFormats: ["njk"],
    htmlTemplateEngine: "njk",
  };
}
