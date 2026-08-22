export default class IcraWritingRedirect {
  data() {
    return {
      permalink: process.env.ELEVENTY_ENV === "prod" ? "/writings/icra-2026/index.html" : false,
      eleventyExcludeFromCollections: true,
      sitemap: false,
    };
  }

  render() {
    const target = "/notes/icra-2026-vienna/";

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <meta name="description" content="These notes moved to the ICRA 2026 Vienna notes page.">
    <meta http-equiv="refresh" content="0; url=${target}">
    <link rel="canonical" href="https://jdranpariya.com${target}">
    <title>ICRA 2026 Notes · Jaydeep Ranpariya</title>
  </head>
  <body>
    <p>This page moved to <a href="${target}">ICRA 2026 Vienna notes</a>.</p>
  </body>
</html>`;
  }
}
