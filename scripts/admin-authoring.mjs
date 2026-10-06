// Shared by the browser editor and its tests. Paths are source paths, not labels.
import { researchRoute, researchContentRoot } from "../apps/research/lib/note-authoring.mjs";
const reserved = new Set(["admin", "css", "tags", "now", "interactive"]);
export function sourceDirectories(files) {
  const directories = new Set(["src", researchContentRoot]);
  for (const { path } of files) {
    const research = path.startsWith(`${researchContentRoot}/`);
    if ((!path.startsWith("src/") && !research) || path.startsWith("src/now/")) continue;
    const parts = path.split("/").slice(0, -1);
    for (let i = research ? 3 : 1; i <= parts.length; i++)
      directories.add(parts.slice(0, i).join("/"));
  }
  return [...directories].sort();
}

export function creationPath(directory, name, kind = "file") {
  const research =
    directory === researchContentRoot || directory.startsWith(`${researchContentRoot}/`);
  if (
    !(research
      ? /^apps\/research\/content(?:\/[a-zA-Z0-9][a-zA-Z0-9_-]*)*$/.test(directory)
      : /^src(?:\/[a-zA-Z0-9][a-zA-Z0-9_-]*)*$/.test(directory)) ||
    (!research && reserved.has(directory.split("/")[1]))
  )
    throw new Error("Choose an editable site folder.");
  const stem = kind === "file" ? name.replace(/\.md$/, "") : name;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(stem))
    throw new Error("Use a name with letters, numbers, hyphens or underscores, without slashes.");
  if (directory === "src" && reserved.has(stem))
    throw new Error("That name is reserved by the site.");
  if (research && directory === researchContentRoot && stem === "research-home")
    throw new Error("That name is reserved by the research homepage.");
  return `${directory}/${stem}${kind === "folder" ? "/index.md" : ".md"}`;
}

export function sourceUrl(path) {
  if (path.startsWith(`${researchContentRoot}/`))
    return `https://research.jdranpariya.com${researchRoute(path)}`;
  if (!/^src\/.+\.md$/.test(path)) return "";
  const route = path
    .slice(4)
    .replace(/\.md$/, "")
    .replace(/(?:^|\/)index$/, "");
  return `/${route ? `${route}/` : ""}`;
}

export function documentSection(path) {
  if (path.startsWith(`${researchContentRoot}/`)) return "research";
  if (path.startsWith("src/library/")) return path.split("/")[2];
  const root = path.split("/")[1];
  return root === "odysseys"
    ? "odyssey"
    : ["writings", "notes", "projects"].includes(root)
      ? root
      : "pages";
}

export function newDocument({
  path,
  title,
  kind = "file",
  template = "auto",
  description = "",
  author = "",
  date,
}) {
  const folder = kind === "folder";
  const research = path.startsWith(`${researchContentRoot}/`);
  const standalone = !folder && (template === "blank" || documentSection(path) === "pages");
  const section = folder ? "folder" : standalone ? "pages" : documentSection(path);
  const fields = {
    title: title.toLowerCase(),
    description: description || (folder ? "" : title),
    published: date,
    lastUpdated: date,
    tags: [],
    status: "draft",
    section,
    layout: research ? "public.njk" : folder ? "layouts/folder.njk" : "layouts/post.njk",
    permalink: research ? researchRoute(path) : sourceUrl(path),
    ...(folder ? { folderIndex: true } : {}),
    ...(standalone ? { standalonePage: true } : {}),
    ...(section === "books" ? { author, fullTitle: title } : {}),
  };
  return `---\n${Object.entries(fields)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n")}\n---\n\n`;
}
