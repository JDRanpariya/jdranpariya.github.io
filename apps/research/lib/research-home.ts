import { noteHtml } from "./note-authoring.mjs";

export type ResearchNote = {
  slug: string;
  title: string;
  body: string;
  html?: string;
  url?: string;
  path?: string;
  folderIndex?: boolean;
};

export type ResearchHome = {
  title: string;
  body: string;
  notes: ResearchNote[];
};

// The title is pane metadata only. Render the complete source as Markdown,
// without assigning paragraphs to an artificial introduction/theme schema.
export function parseResearchHome(markdown: string): ResearchHome {
  const title = markdown.match(/^#\s+(.+)$/m)?.[1];
  if (!title) throw new Error("Research Markdown needs one level-one title.");
  return { title: title.trim(), body: markdown, notes: [] };
}

export function renderResearchHome(document: ResearchHome): string {
  return noteHtml(document.body, {}, document.notes);
}
