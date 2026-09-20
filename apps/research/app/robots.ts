import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/library/", "/api/library/"],
    },
    sitemap: "https://research.jdranpariya.com/sitemap.xml",
  };
}
