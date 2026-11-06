// Curated navigation, not an admin allowlist. Other research articles are
// discovered by source path, including pages not linked in the top navigation.
export const researchReadingPages = Object.freeze(
  [
    { slug: "publications", pageKind: "publications", label: "Publications" },
    { slug: "reinforcement-learning", pageKind: "rl", label: "RL" },
    { slug: "neuro-ai", pageKind: "neuroai", label: "NeuroAI" },
    { slug: "bio-inspired", pageKind: "bioinspired", label: "Bio-inspired" },
    { slug: "ai-for-science", pageKind: "aiscience", label: "AI for science" },
  ].map((page) =>
    Object.freeze({
      ...page,
      path: `apps/research/site/${page.slug}/index.md`,
      route: `/${page.slug}/`,
    })
  )
);

export const researchReadingPageKinds = researchReadingPages.map((page) => page.pageKind);

export const researchSiteSourceRoot = "apps/research/site";
const systemRoutes = new Set([
  "admin",
  "api",
  "assets",
  "index",
  "library",
  "login",
  "logout",
  "notes",
  "people",
  "private",
  "rl",
]);

export function researchArticle(path) {
  if (typeof path !== "string") return null;
  const match = /^apps\/research\/site\/((?:[a-z0-9]+(?:-[a-z0-9]+)*\/)+)index\.md$/.exec(path);
  if (!match) return null;
  const segments = match[1].slice(0, -1).split("/");
  const root = segments[0];
  if (systemRoutes.has(root)) return null;
  const navigation = researchReadingPages.find((page) => page.slug === root);
  const label = segments
    .map((segment, index) =>
      index === 0 && navigation
        ? navigation.label
        : segment.replace(
            /(^|-)([a-z])/g,
            (_, separator, letter) => `${separator ? " " : ""}${letter.toUpperCase()}`
          )
    )
    .join(" / ");
  return {
    path,
    slug: segments.join("/"),
    route: `/${match[1]}`,
    pageKind: navigation?.pageKind ?? root,
    label,
  };
}

export function researchArticleErrors(data, article) {
  const errors = [];
  if (typeof data.title !== "string" || !data.title.trim()) errors.push("title is required.");
  if (typeof data.description !== "string" || !data.description.trim())
    errors.push("description is required.");
  if (data.status !== "published") errors.push("Public reading pages require status: published.");
  if (data.layout !== "public.njk") errors.push("Research layout must be public.njk.");
  if (data.pageKind !== article.pageKind)
    errors.push(`Research pageKind must be ${article.pageKind}.`);
  if (data.permalink !== `${article.route}index.html`)
    errors.push(`Research permalink must be ${article.route}index.html.`);
  if (data.canonical !== `https://research.jdranpariya.com${article.route}`)
    errors.push("Keep this page's canonical research URL.");
  if (data.interestOverview !== undefined && typeof data.interestOverview !== "boolean")
    errors.push("interestOverview must be true or false.");
  if (data.noindex || data.eleventyExcludeFromCollections)
    errors.push("Public reading pages must remain indexable.");
  for (const field of [
    "pagination",
    "eleventyComputed",
    "templateEngineOverride",
    "eleventyImport",
  ])
    if (Object.hasOwn(data, field)) errors.push(`${field} is not supported on research articles.`);
  return errors;
}
