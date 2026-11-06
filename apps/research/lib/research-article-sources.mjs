import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { researchArticle, researchSiteSourceRoot } from "./reading-pages.mjs";

// Filesystem-only discovery. Browser and Worker code use the same pure path
// policy, but discover entries from the repository tree instead of disk.
export async function discoverResearchArticles(
  root = fileURLToPath(new URL("../site/", import.meta.url))
) {
  const articles = [];
  async function walk(directory, prefix = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = `${prefix}${entry.name}`;
      if (entry.isDirectory()) await walk(join(directory, entry.name), `${relative}/`);
      else if (entry.isFile()) {
        const article = researchArticle(`${researchSiteSourceRoot}/${relative}`);
        if (article) articles.push(article);
      }
    }
  }
  await walk(root);
  return articles.sort((a, b) => a.path.localeCompare(b.path));
}
