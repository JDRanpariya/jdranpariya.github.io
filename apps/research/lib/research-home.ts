export type ResearchTheme = {
  slug: string;
  title: string;
  questions: string;
};

export type ResearchHome = {
  title: string;
  introduction: string[];
  themes: ResearchTheme[];
};

const sectionPattern = /^##\s+(.+?)\s+\{#([a-z0-9-]+)\}\s*$/gm;

function paragraphs(markdown: string) {
  return markdown
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

export function parseResearchHome(markdown: string): ResearchHome {
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  if (!titleMatch || titleMatch.index === undefined) {
    throw new Error("Research Markdown needs one level-one title.");
  }

  const matches = [...markdown.matchAll(sectionPattern)];
  const firstSection = matches[0]?.index ?? markdown.length;
  const introStart = titleMatch.index + titleMatch[0].length;
  const introduction = paragraphs(markdown.slice(introStart, firstSection));
  const themes = matches.map((match, index) => {
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd = matches[index + 1]?.index ?? markdown.length;
    return {
      title: match[1].trim(),
      slug: match[2],
      questions: paragraphs(markdown.slice(bodyStart, bodyEnd)).join("\n\n"),
    };
  });

  return { title: titleMatch[1].trim(), introduction, themes };
}
