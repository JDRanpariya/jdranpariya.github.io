import pluginTOC from 'eleventy-plugin-toc';
import markdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import markdownItFootnote from 'markdown-it-footnote';
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

    // Add TOC plugin
    eleventyConfig.addPlugin(pluginTOC, {
        tags: ['h2', 'h3'], // Include h2, h3 in TOC
        wrapper: 'nav', // Wrap TOC in <nav>
        wrapperClass: 'toc-list' // Add class for styling
    });
    // Configure Markdown with anchors and footnotes
    const md = markdownIt()
        .use(markdownItAnchor, { permalink: false })
        .use(markdownItFootnote);

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

    eleventyConfig.addCollection("library_books", (collection) =>
        collection.getFilteredByTags("library", "book")
    );

    eleventyConfig.addCollection("library_papers", (collection) =>
        collection.getFilteredByTags("library", "paper")
    );

    eleventyConfig.addFilter("formatDate", (published) => {
    if (!published) return "";
    const date = published instanceof Date ? published : new Date(published);
    return DateTime.fromJSDate(date).toFormat("LLL d, yyyy"); // Sep 15, 2025
  });

  eleventyConfig.addCollection("writings", function(collection) {
    return collection.getFilteredByTags("writings").sort((a, b) => {
    return new Date(b.data.published) - new Date(a.data.published);});
  });

    // Minify HTML in production
    if (process.env.ELEVENTY_ENV === 'prod') {
        eleventyConfig.addTransform('minify-html', async function (content) {
            if (this.outputPath && this.outputPath.endsWith('.html')) {
                const { minify } = await import('html-minifier');
                return minify(content, {
                    collapseWhitespace: true,
                    removeComments: true,
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
