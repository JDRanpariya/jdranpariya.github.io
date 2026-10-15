import { mkdir, readFile, writeFile } from "node:fs/promises";
import nunjucks from "nunjucks";

// Ahead-of-time compilation uses the same Nunjucks source as Eleventy. The
// Worker only uses the slim runtime, never eval, Function or runtime compilation.
const template = await readFile("site/_includes/components/public-index.njk", "utf8");
const module = nunjucks.precompileString(template, {
  name: "public-index.njk",
  wrapper(templates) {
    return `import nunjucks from 'nunjucks/browser/nunjucks-slim.js';
const templates = {${templates.map((entry) => `${JSON.stringify(entry.name)}: (function() {${entry.template}})()`).join(",")}};
const env = new nunjucks.Environment(new nunjucks.PrecompiledLoader(templates), { autoescape: true });
export function renderPublicIndex(records) {
  return env.render('public-index.njk', { records, badges: { 'great-minds': 'Person', neuroai: 'NeuroAI', rl: 'Reinforcement learning', 'bio-inspired': 'Bio-inspired', 'ai-for-science': 'AI/ML for science' } });
}
`;
  },
});
await mkdir(".cache", { recursive: true });
await writeFile(".cache/public-index.mjs", module);
