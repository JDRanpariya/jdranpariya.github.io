import pluginTOC from 'eleventy-plugin-toc';
import markdownIt from 'markdown-it';
import mk from "@vscode/markdown-it-katex";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import markdownItObsidianCallouts from 'markdown-it-obsidian-callouts';
import markdownItAnchor from 'markdown-it-anchor';
import markdownItFootnote from 'markdown-it-footnote';
import markdownItLinkAttributes from 'markdown-it-link-attributes';
import { DateTime } from 'luxon';

export default function (eleventyConfig) {
    // In .eleventy.js
    eleventyConfig.addPassthroughCopy({
        'assets': 'assets'
    });
    // Serve CSS so it's available in the browser
    eleventyConfig.addPassthroughCopy('build/css');
    // makes passthrough files live-reload instead of being copied once
    eleventyConfig.setServerPassthroughCopyBehavior('passthrough');

    // Add Syntax Highlight plugin
    eleventyConfig.addPlugin(syntaxHighlight);

    // Add TOC plugin
    eleventyConfig.addPlugin(pluginTOC, {
        tags: ['h2', 'h3'], // Include h2, h3 in TOC
        wrapper: 'nav', // Wrap TOC in <nav>
        wrapperClass: 'toc-list' // Add class for styling
    });

    eleventyConfig.addFilter("titlecase", function(str) {
        if (!str) return "";
        return str.replace(/\b\w/g, c => c.toUpperCase());
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
                return href.startsWith('http');
            },
            attrs: {
                target: '_blank',
                rel: 'noopener noreferrer'
            }
        });

    // Filter to extract footnotes from rendered Markdown
    eleventyConfig.addFilter('extractFootnotes', function (content) {
        const footnoteMatch = content.match(/<ol class="footnotes-list">[\s\S]*<\/ol>/);
        return footnoteMatch ? footnoteMatch[0] : '';
    });

    // Filter to remove footnotes from main content
    eleventyConfig.addFilter('removeFootnotes', function (content) {
        return content
            .replace(/<hr class="footnote-sep">/, '')
            .replace(/<ol class="footnotes-list">[\s\S]*<\/ol>/, '');
    });

    eleventyConfig.setLibrary('md', md);

    eleventyConfig.addCollection("books", (collection) =>
        collection.getFilteredByGlob("src/library/books/*.md")
    );

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

    eleventyConfig.addCollection("reckoningTheDead", function(collectionApi) {
     return collectionApi.getFilteredByGlob("src/odysseys/reckoning-the-dead/*.md");
   });

    eleventyConfig.addCollection("alchemistsHearth", function(collectionApi) {
     return collectionApi.getFilteredByGlob("src/odysseys/the-alchemists-hearth/*.md");
   });


    eleventyConfig.addCollection("writings", function(collection) {
        return collection.getFilteredByGlob("src/writings/*.md").sort((a, b) => {
            return new Date(b.data.published) - new Date(a.data.published);});
    });

    eleventyConfig.addFilter("filterByTag", function (collection, tag) {
        return collection.filter(item => (item.data.tags || []).includes(tag));
    });

    // Create collections for each tag
    eleventyConfig.addCollection("tagList", function(collections) {
        const tagSet = new Set();
        collections.getAll().forEach(item => {
            if ("tags" in item.data) {
                let tags = item.data.tags;
                tags = tags.filter(tag => {
                    // Filter out template tags and nav
                    switch(tag) {
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
    eleventyConfig.addCollection("nowUpdates", function(collectionApi) {
        return collectionApi.getFilteredByGlob("src/now/updates/*.md").sort((a, b) => {
            return b.date - a.date; // Sort by date descending
        });
    });

    // Helper filter to group by year/month for the archive (add this too)
    eleventyConfig.addFilter("groupUpdatesByYearMonth", (updates) => {
        const grouped = {};
        updates.forEach(update => {
            const year = update.date.getFullYear();
            const month = update.date.toLocaleString('default', { month: 'long' });
            if (!grouped[year]) grouped[year] = {};
            if (!grouped[year][month]) grouped[year][month] = [];
            grouped[year][month].push(update);
        });
        return grouped;
    });

    eleventyConfig.addFilter("formatDate", (published) => {
        if (!published) return "";
        const date = published instanceof Date ? published : new Date(published);
        return DateTime.fromJSDate(date).toFormat("LLL d, yyyy"); // Sep 15, 2025
    });

    eleventyConfig.addFilter("dateToFormat", (dateObj, format = "yyyy-MM-dd") => {
        // Corrected to handle potential string inputs
        const dt = (dateObj instanceof Date) ? DateTime.fromJSDate(dateObj) : DateTime.fromISO(dateObj.toString());
        return dt.toFormat(format); // e.g., 2025-10-28
    });



    // Minify HTML in production
    if (process.env.ELEVENTY_ENV === 'prod') {
        eleventyConfig.addTransform('minify-html', async function (content) {
            if (this.outputPath && this.outputPath.endsWith('.html')) {
                const { minify } = await import('html-minifier');
                return minify(content, {
                    collapseWhitespace: true,
                    removeComments: true,
                    ignoreCustomFragments: [/<script[\s\S]*?<\/script>/],
                });
            }
            return content;
        });
    }

    return {
        dir: { input: 'src', output: 'build' },
        dataTemplateEngine: 'njk',
        markdownTemplateEngine: 'njk',
    };
}
