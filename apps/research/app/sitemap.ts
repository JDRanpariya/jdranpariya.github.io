import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://research.jdranpariya.com";

  return [
    {
      url: baseUrl,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${baseUrl}/index`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
