// Shared metadata rules for both Eleventy sites. Page descriptions remain author-owned.
export function jsonForScript(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export function jsonLdScript(value) {
  return `<script type="application/ld+json">${jsonForScript(value)}</script>`;
}

function isoDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function pageDescription(data, site) {
  if (data.description?.trim()) return data.description.trim();
  if (site.sectionDescriptions[data.section]) return site.sectionDescriptions[data.section];
  if (data.section === "papers") {
    return `Reading notes on ${data.fullTitle || data.title}${data.author ? `, by ${data.author}` : ""}.`;
  }
  return site.description;
}

export function metadataFor(data, site, { research = false } = {}) {
  const origin = research ? site.research.url : site.url;
  const url = data.canonical || new URL(data.page?.url || "/", `${origin}/`).href;
  const description = research
    ? data.description || site.research.description
    : pageDescription(data, site);
  const article =
    Boolean(data.isPostLayout) ||
    ["writings", "books", "lectures", "papers", "odyssey", "notes", "projects"].includes(
      data.section
    );
  let imagePath = site.image.path;
  // Match the actual OG generator's outputs, including extensionless layout names.
  const prefixes = { writings: "", books: "book-", papers: "paper-", lectures: "lecture-" };
  if (!research && article && data.section in prefixes && data.status !== "draft") {
    imagePath = `/assets/og/${prefixes[data.section]}${data.page?.fileSlug}.png`;
  } else if (!research && data.section === "guest book") {
    imagePath = "/assets/og/guestbook.png";
  }
  const person = {
    "@type": "Person",
    "@id": `${site.url}/#person`,
    name: site.name,
    url: `${site.url}/about/`,
    sameAs: site.sameAs,
  };
  const common = { "@context": "https://schema.org", url, description };
  let structuredData;
  const title = data.fullTitle || data.title || site.name;
  const dates = {
    datePublished: isoDate(data.published),
    dateModified: isoDate(data.lastUpdated || data.published),
  };
  if (!research && data.section === "about") {
    // Do not infer employment or graduation status from an old biography.
    structuredData = { ...common, ...person, description };
  } else if (!research && data.section === "home") {
    structuredData = { ...common, "@type": "ProfilePage", name: site.name, mainEntity: person };
  } else if (!research && ["books", "lectures", "papers"].includes(data.section)) {
    const itemTypes = { books: "Book", lectures: "Course", papers: "ScholarlyArticle" };
    structuredData = {
      ...common,
      "@type": "Review",
      name: `Notes: ${title}`,
      ...dates,
      author: person,
      itemReviewed: {
        "@type": itemTypes[data.section],
        name: title,
        ...(data.author ? { author: { "@type": "Person", name: data.author } } : {}),
        ...(data.link ? { url: data.link } : {}),
        ...(data.cover ? { image: data.cover } : {}),
      },
    };
  } else if (!research && article) {
    structuredData = {
      ...common,
      "@type": data.section === "projects" ? "SoftwareSourceCode" : "Article",
      ...(data.section === "projects" ? { name: title } : { headline: title }),
      ...dates,
      author: person,
      publisher: person,
      keywords: data.tags || [],
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      ...(data.section === "projects" && data.url ? { codeRepository: data.url } : {}),
      ...(data.series
        ? {
            isPartOf: {
              "@type": "CreativeWorkSeries",
              name: data.series.name,
              position: data.series.order,
            },
          }
        : {}),
    };
  } else {
    structuredData = { ...common, "@type": "CollectionPage", name: title, author: person };
  }
  return {
    title: research
      ? data.pageKind === "research"
        ? `${site.name} · Research`
        : `${data.title || "Research"} · ${site.name}`
      : data.section === "home"
        ? site.name
        : data.title || site.name,
    description,
    url,
    siteName: research ? `${site.name} · Research` : site.name,
    type: article ? "article" : "website",
    image: new URL(imagePath, site.url).href,
    imageAlt:
      data.section === "guest book" ? `Guest Book · ${site.name}` : `${title} · ${site.name}`,
    structuredData,
  };
}
