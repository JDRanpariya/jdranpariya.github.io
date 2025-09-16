export default function (eleventyConfig) {
  // Passthrough copy for assets and CSS
  eleventyConfig.addPassthroughCopy('assets');
  // Serve CSS so it's available in the browser
  eleventyConfig.addPassthroughCopy('build/css');
  // makes passthrough files live-reload instead of being copied once
  eleventyConfig.setServerPassthroughCopyBehavior('passthrough');

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
