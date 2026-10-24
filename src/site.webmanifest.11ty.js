export default class {
  data() {
    return { permalink: "/assets/logo/site.webmanifest", eleventyExcludeFromCollections: true };
  }

  render({ site }) {
    return JSON.stringify({
      name: site.name,
      short_name: site.name,
      description: site.description,
      start_url: "/",
      scope: "/",
      display: "standalone",
      theme_color: site.manifest.themeColor,
      background_color: site.manifest.backgroundColor,
      icons: site.manifest.icons,
    });
  }
}
