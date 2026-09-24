import { ResearchNotes } from "../components/research-notes";
import { parseResearchHome } from "../lib/research-home";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { renderToString } from "react-dom/server";

const markdown = await readFile(new URL("../content/research-home.md", import.meta.url), "utf8");
const document = parseResearchHome(markdown);
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
]);
