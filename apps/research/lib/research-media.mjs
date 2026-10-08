import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

// Research is deployed separately from the personal site. Copy only raster
// assets actually referenced by rendered public content, never an entire library.
export function referencedResearchMedia(html) {
  const paths = new Set();
  for (const match of html.matchAll(/\bsrc=["'](\/assets\/images\/[^"']+)["']/g)) {
    const path = match[1].slice(1);
    if (
      /^assets\/images\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:jpe?g|png|webp|avif)$/i.test(
        path
      ) &&
      !path.includes("..")
    )
      paths.add(path);
  }
  return [...paths];
}

export function copyResearchMedia(eleventyConfig, html, root = repositoryRoot) {
  for (const path of referencedResearchMedia(html))
    eleventyConfig.addPassthroughCopy({ [resolve(root, path)]: path });
}
