import { ResearchNotes } from "../components/research-notes";
import { parseResearchHome } from "../lib/research-home";
import { loadPublicNotes } from "../lib/public-notes.mjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { renderToString } from "react-dom/server";
import { researchReadingPages } from "../lib/reading-pages.mjs";
import { noteHtml, parseNote } from "../lib/note-authoring.mjs";

const markdown = await readFile(new URL("../content/research-home.md", import.meta.url), "utf8");
const document = parseResearchHome(markdown);
const publicNotes = await loadPublicNotes();
const readingNotes = await Promise.all(
  researchReadingPages.map(async (page) => {
    const { body } = parseNote(await readFile(page.path.replace("apps/research/", ""), "utf8"));
    return {
      ...page,
      url: page.route,
      title: body.match(/^#\s+(.+)$/m)?.[1] || page.label,
      body,
      html: "",
      readingPage: true,
      fullDocument: true,
    };
  })
);
document.notes = [
  ...publicNotes,
  ...readingNotes,
  {
    slug: "research",
    title: document.title,
    body: document.body,
    url: "/",
    html: "",
    fullDocument: true,
  },
];
for (const note of document.notes) note.html = noteHtml(note.body, note, document.notes);
const cache = new URL("../.cache/", import.meta.url);
await mkdir(cache, { recursive: true });

await Promise.all([
  writeFile(
    new URL("research-home.html", cache),
    renderToString(<ResearchNotes initialDocument={document} initialFocus={0} initialPath={[]} />)
  ),
  writeFile(
    new URL("research-home.json", cache),
    JSON.stringify(document).replaceAll("<", "\\u003c")
  ),
  writeFile(
    new URL("research-notes.json", cache),
    JSON.stringify(
      await Promise.all(
        publicNotes.map(async (note) => ({
          ...note,
          bootstrap: JSON.stringify({ ...document, rootNote: note.slug }).replaceAll(
            "<",
            "\\u003c"
          ),
          pageHtml: renderToString(
            <ResearchNotes
              initialDocument={document}
              initialFocus={0}
              initialPath={[]}
              rootSlug={note.slug}
            />
          ),
        }))
      )
    )
  ),
  writeFile(
    new URL("research-reading-pages.json", cache),
    JSON.stringify(
      Object.fromEntries(
        readingNotes.map((note) => [
          note.pageKind,
          {
            pageHtml: renderToString(
              <ResearchNotes
                initialDocument={document}
                initialFocus={0}
                initialPath={[]}
                rootSlug={note.slug}
              />
            ),
            bootstrap: JSON.stringify({ ...document, rootNote: note.slug }).replaceAll(
              "<",
              "\\u003c"
            ),
          },
        ])
      )
    )
  ),
]);
