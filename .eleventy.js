import pluginTOC from "eleventy-plugin-toc";
import pluginRSS from "@11ty/eleventy-plugin-rss";
import markdownIt from "markdown-it";
import mk from "@vscode/markdown-it-katex";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import markdownItObsidianCallouts from "markdown-it-obsidian-callouts";
import markdownItAnchor from "markdown-it-anchor";
import markdownItFootnote from "markdown-it-footnote";
import markdownItLinkAttributes from "markdown-it-link-attributes";
import markdownItContainer from "markdown-it-container";
import Image from "@11ty/eleventy-img";
import path from "path";
import { fileURLToPath } from "url";
import { DateTime } from "luxon";
import { registerFrontmatterValidation } from "./scripts/frontmatter-schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function (eleventyConfig) {
  // In .eleventy.js
  eleventyConfig.addPassthroughCopy({
    assets: "assets",
    "src/robots.txt": "robots.txt",
  });

  // CSS is written directly to build/css/ by PostCSS (see package.json
  // css:build script) — no passthrough needed. A previous addPassthroughCopy("build/css")
  // here would copy build/css/ to build/build/css/, creating a ghost directory.
  eleventyConfig.setServerPassthroughCopyBehavior("passthrough");

  // Add Syntax Highlight plugin
  eleventyConfig.addPlugin(syntaxHighlight);

  // Add RSS plugin
  eleventyConfig.addPlugin(pluginRSS);

  // Add TOC plugin
  eleventyConfig.addPlugin(pluginTOC, {
    tags: ["h2", "h3"], // Include h2, h3 in TOC
    wrapper: "nav", // Wrap TOC in <nav>
    wrapperClass: "toc-list", // Add class for styling
  });

  eleventyConfig.addFilter("titlecase", function (str) {
    if (!str) return "";
    return str.replace(/\b\w/g, (c) => c.toUpperCase());
  });

  // Frontmatter schema validation — fails build if content is malformed.
  registerFrontmatterValidation(eleventyConfig);
  // Configure Markdown with anchors, footnotes, and external link attributes
  const md = markdownIt({ html: true, linkify: true })
    .use(markdownItAnchor, { permalink: false })
    .use(markdownItFootnote)
    .use(markdownItObsidianCallouts)
    .use(mk.default)
    .use(markdownItLinkAttributes, {
      // Apply only to external links
      matcher(href) {
        return href.startsWith("http");
      },
      attrs: {
        target: "_blank",
        rel: "noopener noreferrer",
      },
    })
    .use(markdownItContainer, "note", {
      render(tokens, idx) {
        if (tokens[idx].nesting === 1) {
          return `<blockquote class="subtitle-note">`;
        } else {
          return `</blockquote>\n`;
        }
      },
    })
    .use(markdownItContainer, "references", {
      render(tokens, idx) {
        if (tokens[idx].nesting === 1) {
          const label = tokens[idx].info.trim().slice("references".length).trim() || "References";
          return `<details class="references-block">\n<summary>${label}</summary>\n`;
        } else {
          return `</details>\n`;
        }
      },
    });

  // Filter to extract footnotes from rendered Markdown
  eleventyConfig.addFilter("extractFootnotes", function (content) {
    const footnoteMatch = content.match(/<ol class="footnotes-list">[\s\S]*<\/ol>/);
    return footnoteMatch ? footnoteMatch[0] : "";
  });

  // Filter to remove footnotes from main content
  eleventyConfig.addFilter("removeFootnotes", function (content) {
    return content
      .replace(/<hr class="footnote-sep">/, "")
      .replace(/<ol class="footnotes-list">[\s\S]*<\/ol>/, "");
  });

  eleventyConfig.setLibrary("md", md);

  // Image optimization shortcode.
  //
  // Accepts:
  //   - local path under assets/   — optimized to AVIF at original width
  //   - absolute URL (http/https)  — fetched at build time, cached under .cache/,
  //                                  emitted as a local AVIF in /img/
  //
  // Both paths go through @11ty/eleventy-img so the returned <img> always has
  // width/height (fixes CLS) and a single AVIF source (smaller than JPEG/PNG).
  //
  // On fetch failure (network down, 404) we warn and fall back to the raw src
  // so the build does not hard-fail. Watch build logs for "image optimization
  // failed" and fix the source URL in frontmatter if a cover silently breaks.
  function escapeAttr(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  eleventyConfig.addNunjucksAsyncShortcode("image", async function (src, alt, className = "") {
    if (!src) return "";

    const isRemote = /^https?:\/\//.test(src);
    let inputPath = src;
    if (!isRemote) {
      if (src.startsWith("/assets/")) {
        inputPath = path.join(__dirname, "assets", src.slice("/assets/".length));
      } else if (src.startsWith("assets/")) {
        inputPath = path.join(__dirname, src);
      }
    }

    const altAttr = escapeAttr(alt);
    const classAttr = escapeAttr(className);

    try {
      const metadata = await Image(inputPath, {
        widths: [null], // null = original width, no resizing
        formats: ["avif"],
        outputDir: "./build/img/",
        urlPath: "/img/",
        // Remote-only options; ignored for local inputs.
        cacheOptions: {
          duration: "30d",
          directory: ".cache",
          removeUrlQueryParams: false,
        },
      });

      const avifMetadata = metadata.avif[0];
      return `<img src="${avifMetadata.url}" alt="${altAttr}" loading="lazy" class="${classAttr}" width="${avifMetadata.width}" height="${avifMetadata.height}">`;
    } catch (e) {
      console.warn(
        `[image] optimization failed for ${src}: ${e.message}. Falling back to raw src.`
      );
      return `<img src="${escapeAttr(src)}" alt="${altAttr}" loading="lazy" class="${classAttr}">`;
    }
  });

  eleventyConfig.addCollection("books", (collection) => {
    return collection.getFilteredByGlob("src/library/books/*.md").sort((a, b) => {
      // compare titles alphabetically, case-insensitive
      let titleA = a.data.title.toLowerCase();
      let titleB = b.data.title.toLowerCase();
      if (titleA < titleB) return -1;
      if (titleA > titleB) return 1;
      return 0;
    });
  });

  eleventyConfig.addCollection("lectures", (collection) =>
    collection.getFilteredByGlob("src/library/lectures/*.md")
  );

  eleventyConfig.addCollection("papers", (collection) =>
    collection.getFilteredByGlob("src/library/papers/*.md")
  );
  // Projects

  eleventyConfig.addCollection("projects", (collection) =>
    collection.getFilteredByGlob("src/projects/**/*.md")
  );

  // odysseys
  eleventyConfig.addCollection("odysseys", (collection) =>
    collection.getFilteredByGlob("src/odysseys/**/*.md")
  );

  eleventyConfig.addCollection("reckoningTheDead", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/odysseys/reckoning-the-dead/*.md");
  });

  eleventyConfig.addCollection("alchemistsHearth", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/odysseys/the-alchemists-hearth/*.md");
  });

  eleventyConfig.addFilter("limit", (arr, limit) => arr.slice(0, limit));

  eleventyConfig.addCollection("writings", function (collection) {
    return collection
      .getFilteredByGlob("src/writings/*.md")
      .filter((item) => item.data.status !== "draft")
      .sort((a, b) => new Date(b.data.published) - new Date(a.data.published));
  });

  eleventyConfig.addFilter("filterByTag", function (collection, tag) {
    return collection.filter((item) => (item.data.tags || []).includes(tag));
  });

  // Create collections for each tag
  eleventyConfig.addCollection("tagList", function (collections) {
    const tagSet = new Set();
    collections.getAll().forEach((item) => {
      if ("tags" in item.data) {
        let tags = item.data.tags;
        tags = tags.filter((tag) => {
          // Filter out template tags and nav
          switch (tag) {
            case "all":
            case "nav":
            case "post":
            case "posts":
              return false;
          }
          return true;
        });
        for (const tag of tags) {
          tagSet.add(tag);
        }
      }
    });
    return Array.from(tagSet).sort();
  });

  // Add this within your module.exports = function(eleventyConfig) { ... };
  eleventyConfig.addCollection("nowUpdates", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/now/updates/*.md").sort((a, b) => {
      return b.date - a.date; // Sort by date descending
    });
  });

  // Helper filter to group by year/month for the archive
  eleventyConfig.addFilter("groupUpdatesByYearMonth", (updates) => {
    const grouped = {};
    updates.forEach((update) => {
      const year = update.date.getFullYear();
      const month = update.date.toLocaleString("default", { month: "long" });
      if (!grouped[year]) grouped[year] = {};
      if (!grouped[year][month]) grouped[year][month] = [];
      grouped[year][month].push(update);
    });

    // Convert to array and sort years descending (newest first)
    const sortedYears = Object.keys(grouped)
      .sort((a, b) => b - a) // 2026, 2025, 2024...
      .map((year) => [year, grouped[year]]);

    return sortedYears;
  });

  eleventyConfig.addFilter("formatDate", (published) => {
    if (!published) return "";
    const date = published instanceof Date ? published : new Date(published);
    return DateTime.fromJSDate(date).toFormat("LLL d, yyyy"); // Sep 15, 2025
  });

  eleventyConfig.addFilter("dateToFormat", (dateObj, format = "yyyy-MM-dd") => {
    // Corrected to handle potential string inputs
    const dt =
      dateObj instanceof Date ? DateTime.fromJSDate(dateObj) : DateTime.fromISO(dateObj.toString());
    return dt.toFormat(format); // e.g., 2025-10-28
  });

  // Minify HTML in production
  if (process.env.ELEVENTY_ENV === "prod") {
    eleventyConfig.addTransform("minify-html", async function (content) {
      if (this.outputPath && this.outputPath.endsWith(".html")) {
        const { minify } = await import("html-minifier");
        return minify(content, {
          collapseWhitespace: true,
          conservativeCollapse: true, // Preserve at least one space between inline elements
          removeComments: true,
          ignoreCustomFragments: [/<script[\s\S]*?<\/script>/],
        });
      }
      return content;
    });
  }

  return {
    dir: { input: "src", output: "build" },
    dataTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
