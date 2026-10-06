import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { noteHtml, parseNote, researchRoute, researchContentRoot } from "./note-authoring.mjs";

export async function loadPublicNotes(directory = new URL("../content/", import.meta.url)) {
  const sources = [];
  async function walk(root, prefix = "") {
    for (const entry of await readdir(root, { withFileTypes: true })) {
      const relative = `${prefix}${entry.name}`;
      if (entry.isDirectory()) await walk(join(String(root), entry.name), `${relative}/`);
      else if (entry.isFile() && entry.name.endsWith(".md") && relative !== "research-home.md") {
        const { data, body } = parseNote(await readFile(join(String(root), entry.name), "utf8"));
        const path = `${researchContentRoot}/${relative}`;
        const url = researchRoute(path);
        if (!["draft", "published"].includes(data.status))
          throw new Error(`${path}: status must be draft or published.`);
        if (!data.title || typeof data.title !== "string")
          throw new Error(`${path}: title is required.`);
        if (data.permalink && data.permalink !== url)
          throw new Error(`${path}: permalink must be ${url}.`);
        if (data.status === "draft") continue;
        sources.push({
          path,
          url,
          slug: relative.replace(/\.md$/, "").replace(/\/index$/, ""),
          title: data.title,
          description: data.description || "",
          body,
          folderIndex: data.folderIndex === true,
          html: "",
        });
      }
    }
  }
  // URL objects need a filesystem path before descending into child directories.
  const { fileURLToPath } = await import("node:url");
  await walk(directory instanceof URL ? fileURLToPath(directory) : directory);
  const routes = new Set();
  for (const note of sources) {
    if (routes.has(note.url)) throw new Error(`Duplicate research route: ${note.url}`);
    routes.add(note.url);
  }
  if (sources.length && !routes.has("/notes/"))
    sources.push({
      path: `${researchContentRoot}/index.md`,
      url: "/notes/",
      slug: "index",
      title: "Research notes",
      description: "",
      body: "",
      folderIndex: true,
      html: "",
    });
  sources.sort((a, b) => a.title.localeCompare(b.title));
  for (const note of sources) note.html = noteHtml(note.body, note, sources);
  return sources;
}
