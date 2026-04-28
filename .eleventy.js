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

  // Legacy filter — kept for back-compat during template migration.
  eleventyConfig.addFilter("titlecase", function (str) {
    if (!str) return "";
    return str.replace(/\b\w/g, (c) => c.toUpperCase());
  });

  /**
   * smartTitleCase — Title Case respecting English small-word conventions.
   *
   * Used to render Title Case display titles from lowercase frontmatter
   * (see DESIGN.md §4.2). Rules:
   *   - Keep small words lowercase unless they are the first or last word.
   *   - Keep all-caps tokens (acronyms: AI, UNIX, JAX, RL, PID, NMPC) as-is.
   *   - Capitalize everything else at its first letter; preserve internal
   *     casing so camelCase / mid-word apostrophes (don't → Don't) work.
   */
  const SMALL_WORDS = new Set([
    "a",
    "an",
    "and",
    "as",
    "at",
    "but",
    "by",
    "for",
    "in",
    "nor",
    "of",
    "on",
    "or",
    "so",
    "the",
    "to",
    "up",
    "yet",
    "with",
    "vs",
    "via",
  ]);
  eleventyConfig.addFilter("smartTitleCase", function (str) {
    if (!str) return "";
    const words = String(str).split(/(\s+)/); // keep whitespace tokens
    const wordIdx = words.reduce((acc, w, i) => {
      if (/\S/.test(w)) acc.push(i);
      return acc;
    }, []);
    const firstIdx = wordIdx[0];
    const lastIdx = wordIdx[wordIdx.length - 1];
    return words
      .map((token, i) => {
        if (!/\S/.test(token)) return token;
        // Preserve all-caps tokens (AI, UNIX, RL, NMPC).
        if (/^[A-Z0-9]{2,}$/.test(token)) return token;
        const lower = token.toLowerCase();
        const bare = lower.replace(/[^a-z]/g, "");
        if (i !== firstIdx && i !== lastIdx && SMALL_WORDS.has(bare)) {
          return lower;
        }
        // Capitalize first alphabetic char of the token, keep rest lowercase.
        return lower.replace(/([a-z])/, (c) => c.toUpperCase());
      })
      .join("");
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

  // ------------------------------------------------------------------
  // Guestbook helpers — sanitise a user-submitted "URL" field and
  // render relative dates à la Eva Decker's guestbook. Kept next to
  // each other so new contributors see them as a pair.
  // ------------------------------------------------------------------

  // Find an object in an array by matching a property value — a
  // Nunjucks-friendly replacement for Jinja's                                           (Nunjucks ships neither       nor                 ,
  // so that Jinja idiom silently returns undefined). Used by the
  // guestbook template to resolve each entry.theme string into its
  // notecardThemes registry record.
  //
  //   {% set theme = themes | findBy("key", entry.theme) %}
  eleventyConfig.addFilter("findBy", (arr, key, value) => {
    if (!Array.isArray(arr)) return null;
    return arr.find((item) => item && item[key] === value) || null;
  });

  // Detect messages that contain box-drawing / ASCII art characters.
  // Returns true if the message likely needs monospace rendering to
  // preserve alignment (box-drawing, block elements, braille patterns).
  eleventyConfig.addFilter("isAsciiArt", (str) => {
    if (!str) return false;
    // Box-drawing (U+2500–257F), block elements (U+2580–259F),
    // braille (U+2800–28FF), or 3+ consecutive spaces (alignment trick)
    return /[\u2500-\u257F\u2580-\u259F\u2800-\u28FF]/.test(str) ||
           /   {3,}/.test(str);
  });

  // Normalise a "URL" form field into { isUrl, href } — Google Form
  // respondents sometimes paste "example.com", "https://…", a city
  // name ("Erlangen"), or leave it blank. We want:
  //   ""            -> { isUrl: false }
  //   "Erlangen"    -> { isUrl: false } (no dot or scheme -> not a URL)
  //   "example.com" -> { isUrl: true,  href: "https://example.com" }
  //   "https://x.y" -> { isUrl: true,  href: "https://x.y" }
  eleventyConfig.addFilter("toHref", (raw) => {
    if (!raw) return { isUrl: false };
    const s = String(raw).trim();
    if (!s) return { isUrl: false };
    const lower = s.toLowerCase();
    if (lower.startsWith("http://") || lower.startsWith("https://")) {
      return { isUrl: true, href: s };
    }
    // Bare domain heuristic — must contain a dot, no spaces, and the
    // TLD segment must be >= 2 alphanumeric chars. Keeps "Erlangen"
    // from being promoted to a link while still catching "ky.fyi",
    // "example.com", "a.bc".
    if (/^[^\s]+\.[a-z0-9]{2,}$/i.test(s)) {
      return { isUrl: true, href: "https://" + s };
    }
    return { isUrl: false };
  });

  // Guestbook / notecard date formatter — mirrors Eva Decker's
  // guestbook phrasing:
  //   < 1 min            -> "just now"
  //   < 1 hour           -> "N minutes ago" ("a minute ago" at N=1)
  //   < 1 day            -> "N hours ago"   ("an hour ago" at N=1)
  //   < 1 week           -> "N days ago"    ("yesterday" at N=1)
  //   same calendar year -> "23 Apr"
  //   past years         -> "23 Apr 2025"
  //
  // Input may be an ISO date string ("2026-04-26") or a full ISO
  // timestamp ("2026-04-26T12:29:02"). Date-only strings are anchored
  // to local midnight.       is overridable for tests.
  eleventyConfig.addFilter("relativeDate", (raw, now) => {
    if (!raw) return "";
    const dt =
      raw instanceof Date
        ? DateTime.fromJSDate(raw)
        : DateTime.fromISO(String(raw));
    if (!dt.isValid) return "";
    const currentTime = now || DateTime.now();

    const diffMin = currentTime.diff(dt, "minutes").minutes;
    if (diffMin < 1) return "just now";
    if (diffMin < 60) {
      const n = Math.round(diffMin);
      return n === 1 ? "a minute ago" : n + " minutes ago";
    }
    const diffH = currentTime.diff(dt, "hours").hours;
    if (diffH < 24) {
      const n = Math.round(diffH);
      return n === 1 ? "an hour ago" : n + " hours ago";
    }
    const diffD = currentTime.diff(dt, "days").days;
    if (diffD < 7) {
      const n = Math.round(diffD);
      if (n === 1) return "yesterday";
      return n + " days ago";
    }
    // Absolute date. Include the year only if the entry is from a
    // previous calendar year — keeps the current year's list visually
    // light, while older entries still disambiguate.
    return dt.year === currentTime.year
      ? dt.toFormat("d LLL")
      : dt.toFormat("d LLL yyyy");
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
