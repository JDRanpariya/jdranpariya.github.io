import { load } from "js-yaml";
import { validateSourceData } from "../../../scripts/frontmatter-schema.js";

const personalLayouts = new Set([
  "layouts/post",
  "layouts/post.njk",
  "layouts/folder.njk",
  "layouts/about.njk",
  "layouts/base",
  "layouts/base.njk",
]);

function validDate(value) {
  if (value instanceof Date) return !Number.isNaN(value.valueOf());
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

// This guard is deliberately isolated from browser rendering and Git writes.
// Build-time schema rules remain canonical for personal content.
export function validateAdminSource(path, content) {
  if (path === "apps/research/content/research-home.md") {
    if (!/^#\s+\S.*$/m.test(content)) throw new Error("Research Markdown needs a level-one title.");
    return {};
  }
  const match = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!match) throw new Error("Add valid YAML frontmatter between --- lines before publishing.");
  let data;
  try {
    data = load(match[1]);
  } catch (error) {
    throw new Error(`Invalid frontmatter: ${error.reason || error.message}`);
  }
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("Frontmatter must be a YAML mapping.");
  const errors = [];
  const research = path.startsWith("apps/research/content/");
  const now = path.startsWith("src/now/updates/");
  if (research) {
    if (!/^(?:[a-zA-Z0-9][a-zA-Z0-9_-]*\/)*[a-zA-Z0-9][a-zA-Z0-9_-]*\.md$/.test(path.slice(22)))
      errors.push("Invalid research source path.");
    if (typeof data.title !== "string" || !data.title.trim()) errors.push("title is required.");
    if (!["draft", "published"].includes(data.status))
      errors.push("status must be draft or published.");
    if (data.layout !== undefined && data.layout !== "public.njk")
      errors.push("Research layout must be public.njk.");
    const stem = path
      .slice(22)
      .replace(/\.md$/, "")
      .replace(/(?:^|\/)index$/, "");
    const route = `/notes/${stem ? `${stem}/` : ""}`;
    if (data.permalink !== undefined && data.permalink !== route)
      errors.push(`Research permalink must be ${route}.`);
  } else if (now) {
    if (data.layout !== false) errors.push("Now updates require layout: false.");
    if (!validDate(data.date)) errors.push("Now updates require a valid date.");
  } else {
    errors.push(...validateSourceData(data, path));
    if (typeof data.title !== "string" || !data.title.trim()) errors.push("title is required.");
    if (!personalLayouts.has(data.layout)) errors.push("Choose an existing supported site layout.");
    if (data.permalink !== undefined && data.permalink !== false) {
      if (
        typeof data.permalink !== "string" ||
        !/^\/(?!\/)[a-zA-Z0-9_./-]*$/.test(data.permalink) ||
        data.permalink.includes("..")
      )
        errors.push("permalink must be a local site path or false.");
    }
  }
  for (const field of ["published", "lastUpdated"])
    if (data[field] !== undefined && !validDate(data[field]))
      errors.push(`${field} must be a valid date.`);
  // YAML timestamps can normalize an impossible unquoted date such as Feb 31.
  // Check its original spelling too, rather than trusting the normalized Date.
  for (const field of ["published", "lastUpdated", "date"]) {
    const raw = match[1].match(
      new RegExp(`^${field}:[ \\t]*(\\d{4}-\\d{2}-\\d{2})[ \\t]*(?:#.*)?$`, "m")
    );
    if (raw && !validDate(raw[1])) errors.push(`${field} must be a valid date.`);
  }
  if (
    data.tags !== undefined &&
    (!Array.isArray(data.tags) || data.tags.some((tag) => typeof tag !== "string" || !tag.trim()))
  )
    errors.push("tags must be an array of nonempty strings.");
  if (errors.length) throw new Error(errors.join("\n"));
  return data;
}

export async function boundedJson(request, limit) {
  if (Number(request.headers.get("content-length")) > limit) {
    const error = new Error("The request is too large.");
    error.status = 413;
    throw error;
  }
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Invalid JSON body.");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      const error = new Error("The request is too large.");
      error.status = 413;
      throw error;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
