// Explicit editable page registry. Templates and private library data are not sources.
export const researchReadingPages = Object.freeze(
  [
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

export function researchReadingPage(path) {
  return researchReadingPages.find((page) => page.path === path);
}
