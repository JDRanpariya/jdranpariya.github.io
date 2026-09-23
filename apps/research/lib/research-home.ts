export type ResearchTheme = {
  slug: string;
  title: string;
  questions: string;
};

export type ResearchNote = {
  slug: string;
  title: string;
  body: string;
};

export type ResearchHome = {
  title: string;
  introduction: string[];
  quote?: {
    attribution: string;
    text: string;
  };
  themes: ResearchTheme[];
  notes: ResearchNote[];
};

const sectionPattern = /^##\s+(.+?)\s+\{#([a-z0-9-]+)\}\s*$/gm;

function paragraphs(markdown: string) {
  return markdown
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

function introduction(markdown: string) {
  const copy: string[] = [];
  let quote: ResearchHome["quote"];

  for (const block of markdown.trim().split(/\n\s*\n/)) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length && lines.every((line) => line.startsWith(">"))) {
      const quoteLines = lines.map((line) => line.replace(/^>\s?/, ""));
      const attribution = quoteLines.at(-1)?.match(/^—\s*(.+)$/u);
      if (attribution && quoteLines.length > 1) {
        quote = {
          attribution: attribution[1].trim(),
          text: quoteLines.slice(0, -1).join(" ").trim(),
        };
        continue;
      }
    }
    const paragraph = lines.join(" ").trim();
    if (paragraph) copy.push(paragraph);
  }

  return { copy, quote };
}

export function parseResearchHome(markdown: string): ResearchHome {
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  if (!titleMatch || titleMatch.index === undefined) {
    throw new Error("Research Markdown needs one level-one title.");
  }

  const matches = [...markdown.matchAll(sectionPattern)];
  const firstSection = matches[0]?.index ?? markdown.length;
  const introStart = titleMatch.index + titleMatch[0].length;
  const intro = introduction(markdown.slice(introStart, firstSection));
  const themes = matches.map((match, index) => {
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd = matches[index + 1]?.index ?? markdown.length;
    return {
      title: match[1].trim(),
      slug: match[2],
      questions: paragraphs(markdown.slice(bodyStart, bodyEnd)).join("\n\n"),
    };
  });

  return {
    title: titleMatch[1].trim(),
    introduction: intro.copy,
    quote: intro.quote,
    themes,
    // Theme questions belong to the homepage. There are no authored note pages yet.
    notes: [],
  };
}
