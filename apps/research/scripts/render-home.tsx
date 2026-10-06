import { ResearchNotes } from "../components/research-notes";
import { parseResearchHome } from "../lib/research-home";
import { loadPublicNotes } from "../lib/public-notes.mjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { renderToString } from "react-dom/server";

const markdown = await readFile(new URL("../content/research-home.md", import.meta.url), "utf8");
const document = parseResearchHome(markdown);
document.notes = await loadPublicNotes();
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
        document.notes.map(async (note) => ({
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
]);
