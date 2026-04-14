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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function (eleventyConfig) {
  // In .eleventy.js
  eleventyConfig.addPassthroughCopy({
    assets: "assets",
  });

  // Serve CSS so it's available in the browser
  eleventyConfig.addPassthroughCopy("build/css");
  // makes passthrough files live-reload instead of being copied once
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
          const label =
            tokens[idx].info.trim().slice("references".length).trim() ||
            "References";
          return `<details class="references-block">\n<summary>${label}</summary>\n`;
        } else {
          return `</details>\n`;
        }
      },
    });

  // Filter to extract footnotes from rendered Markdown
  eleventyConfig.addFilter("extractFootnotes", function (content) {
    const footnoteMatch = content.match(
      /<ol class="footnotes-list">[\s\S]*<\/ol>/,
    );
    return footnoteMatch ? footnoteMatch[0] : "";
  });

  // Filter to remove footnotes from main content
  eleventyConfig.addFilter("removeFootnotes", function (content) {
    return content
      .replace(/<hr class="footnote-sep">/, "")
      .replace(/<ol class="footnotes-list">[\s\S]*<\/ol>/, "");
  });

  eleventyConfig.setLibrary("md", md);

  // Image optimization shortcode
  eleventyConfig.addNunjucksAsyncShortcode("image", async function (src, alt, className = "") {
    if (!src) return "";

    // Remote image - pass through as-is
    if (src.startsWith("http")) {
      return `<img src="${src}" alt="${alt}" loading="lazy" class="${className}">`;
    }

    // Local image - optimize
    let inputPath = src;
    if (src.startsWith("/assets/")) {
      inputPath = path.join(__dirname, "assets", src.slice("/assets/".length));
    } else if (src.startsWith("assets/")) {
      inputPath = path.join(__dirname, src);
    }

    try {
      // Generate AVIF at original size (widths: [null] preserves dimensions)
      const metadata = await Image(inputPath, {
        widths: [null], // null = original width, no resizing
        formats: ["avif"], // AVIF only for simplicity
        outputDir: "./build/img/",
        urlPath: "/img/",
      });

      const avifMetadata = metadata.avif[0];

      // Return simple img tag (not picture element)
      return `<img src="${avifMetadata.url}" alt="${alt}" loading="lazy" class="${className}" width="${avifMetadata.width}" height="${avifMetadata.height}">`;
    } catch (e) {
      console.error(`Error optimizing image ${src}:`, e.message);
      // Fallback to original
      return `<img src="${src}" alt="${alt}" loading="lazy" class="${className}">`;
    }
  });

  eleventyConfig.addCollection("books", (collection) => {
    return collection
      .getFilteredByGlob("src/library/books/*.md")
      .sort((a, b) => {
        // compare titles alphabetically, case-insensitive
        let titleA = a.data.title.toLowerCase();
        let titleB = b.data.title.toLowerCase();
        if (titleA < titleB) return -1;
        if (titleA > titleB) return 1;
        return 0;
      });
  });

  eleventyConfig.addCollection("lectures", (collection) =>
    collection.getFilteredByGlob("src/library/lectures/*.md"),
  );

  eleventyConfig.addCollection("papers", (collection) =>
    collection.getFilteredByGlob("src/library/papers/*.md"),
  );
  // Projects

  eleventyConfig.addCollection("projects", (collection) =>
    collection.getFilteredByGlob("src/projects/**/*.md"),
  );

  // odysseys
  eleventyConfig.addCollection("odysseys", (collection) =>
    collection.getFilteredByGlob("src/odysseys/**/*.md"),
  );

  eleventyConfig.addCollection("reckoningTheDead", function (collectionApi) {
    return collectionApi.getFilteredByGlob(
      "src/odysseys/reckoning-the-dead/*.md",
    );
  });

  eleventyConfig.addCollection("alchemistsHearth", function (collectionApi) {
    return collectionApi.getFilteredByGlob(
      "src/odysseys/the-alchemists-hearth/*.md",
    );
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
    return collectionApi
      .getFilteredByGlob("src/now/updates/*.md")
      .sort((a, b) => {
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
      dateObj instanceof Date
        ? DateTime.fromJSDate(dateObj)
        : DateTime.fromISO(dateObj.toString());
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
