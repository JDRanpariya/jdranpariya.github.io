import { readFileSync } from "node:fs";

const origin = process.env.RESEARCH_BASE_URL ?? "http://127.0.0.1:8790";
let checks = 0;

async function request(path, expected, options = {}) {
  const response = await fetch(new URL(path, origin), { redirect: "manual", ...options });
  if (response.status !== expected) {
    throw new Error(`${path}: expected HTTP ${expected}, got ${response.status}`);
  }
  checks += 1;
  return response;
}

const home = await (await request("/", 200)).text();
if (
  !home.includes("information, compression and learning dynamics") ||
  !home.includes('data-note-trail="research"')
) {
  throw new Error("The public research page is missing its Eleventy document.");
}
if (!home.includes('data-domains="research.jdranpariya.com"')) {
  throw new Error("The research homepage is missing public analytics.");
}

const index = await (await request("/index", 200)).text();
if (
  !index.includes("Research index") ||
  !index.includes('id="index-root"') ||
  !index.includes("/assets/index.js") ||
  index.includes("/assets/research.js") ||
  index.includes("privateNotes") ||
  index.includes('"researchFit"')
) {
  throw new Error("The selected index is missing or contains private fields.");
}
if (!index.includes('data-domains="research.jdranpariya.com"')) {
  throw new Error("The selected index is missing public analytics.");
}
const rl = await (await request("/reinforcement-learning/", 200)).text();
for (const text of [
  "Reinforcement learning interests",
  "Start here",
  "Problem formulation",
  "Predictive Representations: Building Blocks of Intelligence",
  "Safety and trust",
  "Continual adaptation on real robots",
  "Catastrophic forgetting and loss of plasticity",
  "Differentiable simulation",
  "Causality in robotics",
  "Continual adaptation",
  "Temporal abstraction and credit assignment",
  "Interesting reads",
  "Deep Reinforcement Learning for Robotics: A Survey of Real-World Successes",
  "A Survey of Temporal Credit Assignment in Deep Reinforcement Learning",
]) {
  if (!rl.includes(text)) throw new Error(`Public RL interests missing: ${text}`);
}
if (rl.includes('name="robots" content="noindex') || rl.includes("<details")) {
  throw new Error("RL must remain publicly indexable with visible reading lists.");
}
const rlSource = readFileSync(
  new URL("../site/reinforcement-learning/index.md", import.meta.url),
  "utf8"
);
const paperUrls = [...rlSource.matchAll(/^\s*- \[[^\]]+\]\((https?:\/\/[^)]+)\)/gmu)].map(
  (match) => match[1]
);
if (paperUrls.length !== 82) throw new Error("Expected all 82 RL reading links.");
for (const url of paperUrls) {
  if (!rl.includes(`href="${url.replaceAll("&", "&amp;")}"`))
    throw new Error(`RL paper link missing from public HTML: ${url}`);
}
if (!rl.includes('data-domains="research.jdranpariya.com"')) {
  throw new Error("The RL page is missing public analytics.");
}
const neuroai = await (await request("/neuro-ai/", 200)).text();
for (const text of [
  "NeuroAI interests",
  "Start here",
  "Embodied control and neuromechanics",
  "Continual learning and memory",
  "Substrate and efficient computation",
  "Biologically plausible learning",
]) {
  if (!neuroai.includes(text)) throw new Error(`Public NeuroAI interests missing: ${text}`);
}
if (
  neuroai.includes('name="robots" content="noindex') ||
  neuroai.includes("<details") ||
  neuroai.includes("103 checked reviews")
) {
  throw new Error("NeuroAI must be an indexable static reading page without build notes.");
}
const neuroaiSource = readFileSync(new URL("../site/neuro-ai/index.md", import.meta.url), "utf8");
const neuroaiUrls = [...neuroaiSource.matchAll(/^\s*- \[[^\]]+\]\((https:\/\/[^)]+)\)/gmu)].map(
  (match) => match[1]
);
if (neuroaiUrls.length !== 48) throw new Error("Expected all 48 NeuroAI paper links.");
for (const url of neuroaiUrls) {
  if (!neuroai.includes(`href="${url}"`))
    throw new Error(`NeuroAI paper link missing from public HTML: ${url}`);
}
if (!neuroai.includes('data-domains="research.jdranpariya.com"')) {
  throw new Error("The NeuroAI page is missing public analytics.");
}
const bioinspired = await (await request("/bio-inspired/", 200)).text();
const bioSource = readFileSync(new URL("../site/bio-inspired/index.md", import.meta.url), "utf8");
const bioUrls = [...bioSource.matchAll(/^\s*- \[[^\]]+\]\((https:\/\/[^)]+)\)/gmu)].map(
  (match) => match[1]
);
if (bioUrls.length !== 48) throw new Error("Expected all 48 Bio-inspired paper links.");
for (const url of bioUrls) {
  if (!bioinspired.includes(`href="${url}"`))
    throw new Error(`Bio-inspired paper link missing from public HTML: ${url}`);
}
if (
  !bioinspired.includes("Bio-inspired interests") ||
  !bioinspired.includes('data-domains="research.jdranpariya.com"') ||
  bioinspired.includes('name="robots" content="noindex') ||
  bioinspired.includes("104 checked reviews") ||
  bioinspired.includes("<details")
)
  throw new Error("Bio-inspired must remain a public static reading page without build notes.");
const aiscience = await (await request("/ai-for-science/", 200)).text();
const scienceSource = readFileSync(
  new URL("../site/ai-for-science/index.md", import.meta.url),
  "utf8"
);
const scienceUrls = [...scienceSource.matchAll(/^\s*- \[[^\]]+\]\((https?:\/\/[^)]+)\)/gmu)].map(
  (match) => match[1]
);
if (scienceUrls.length !== 157) throw new Error("Expected all 157 AI for science reading links.");
for (const url of scienceUrls) {
  if (!aiscience.includes(`href="${url.replaceAll("&", "&amp;")}"`))
    throw new Error(`AI for science link missing from public HTML: ${url}`);
}
if (
  !aiscience.includes("AI for science interests") ||
  aiscience.includes('name="robots" content="noindex') ||
  aiscience.includes("_work/") ||
  !aiscience.includes('data-domains="research.jdranpariya.com"')
)
  throw new Error("AI for science must be public without internal build notes.");
for (const html of [home, index, rl, neuroai, bioinspired, aiscience]) {
  if (/>\s*Research\s*<\/a\s*>/u.test(html))
    throw new Error("The name already links home; a separate Research section is redundant.");
  if (!html.includes('class="research-navigation-name"'))
    throw new Error("The shared navigation must retain the name link back home.");
  for (const href of [
    "/reinforcement-learning/",
    "/neuro-ai/",
    "/bio-inspired/",
    "/ai-for-science/",
  ]) {
    if (!html.includes(`href="${href}"`)) throw new Error(`Public navigation missing: ${href}`);
  }
}
for (const [label, html, count] of [
  ["RL", rl, 5],
  ["NeuroAI", neuroai, 4],
  ["Bio-inspired", bioinspired, 5],
  ["AI for science", aiscience, 6],
]) {
  if (
    !html.includes('data-note-trail="research"') ||
    !html.includes('id="research-note-routes"') ||
    !html.includes("/assets/codex-notes.js") ||
    html.includes("/assets/research.js") ||
    html.includes('id="research-home-data"')
  )
    throw new Error(
      `${label} must use Eleventy HTML and the shared note-trail enhancement, not React hydration.`
    );
  if (
    !html.includes('class="research-reading-body research-interest-overview"') ||
    !html.includes("Areas of interest")
  )
    throw new Error(`${label} is missing its interest overview.`);
  const links = [...html.matchAll(/href="#([^"]+)"/gu)]
    .map((match) => match[1])
    .filter((id) => id !== "main");
  if (links.length !== count) throw new Error(`${label} interest overview is incomplete.`);
  for (const id of links) {
    if (!html.includes(`id="${id}"`)) throw new Error(`${label} has a broken topic link: ${id}`);
  }
  const visibleHtml = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gu, "");
  if (visibleHtml.includes("{#"))
    throw new Error(`${label} is leaking authored heading identifiers.`);
}
await request("/reinforcement-learning", 301);
await request("/reinforcement-learning/index.html", 301);
await request("/neuro-ai/", 200, { method: "HEAD" });
await request("/neuro-ai", 301);
await request("/neuro-ai/index.html", 301);
await request("/bio-inspired/", 200, { method: "HEAD" });
await request("/bio-inspired", 301);
await request("/bio-inspired/index.html", 301);
await request("/ai-for-science/", 200, { method: "HEAD" });
await request("/ai-for-science", 301);
await request("/ai-for-science/index.html", 301);
for (const href of [
  "/library/great-minds",
  "/library/neuroai",
  "/library/rl",
  "/library/bio-inspired",
  "/library/ai-for-science",
  "/login?returnTo=%2Flibrary%2Fgreat-minds",
]) {
  if (!index.includes(`href="${href}"`)) throw new Error(`Index access link missing: ${href}`);
}

const login = await (await request("/login", 200)).text();
if (login.includes('data-domains="research.jdranpariya.com"')) {
  throw new Error("Public analytics must not run on the private login page.");
}
const library = await request("/library/great-minds", 302);
if (!library.headers.get("location")?.includes("/login?returnTo=")) {
  throw new Error("Signed-out library visitors were not directed to login.");
}
await request("/library/great-minds/index.html", 301);
await request("/library/neuroai", 302);
await request("/library/neuroai/index.html", 301);
await request("/library/rl", 302);
await request("/library/rl/index.html", 301);
await request("/library/bio-inspired", 302);
await request("/library/bio-inspired/index.html", 301);
await request("/library/ai-for-science", 302);
await request("/library/ai-for-science/index.html", 301);
await request("/api/library/annotations?collection=great-minds", 401);
await request("/api/library/annotations?collection=neuroai", 401);
await request("/api/library/annotations?collection=rl", 401);
await request("/api/library/annotations?collection=bio-inspired", 401);
await request("/api/library/annotations?collection=ai-for-science", 401);
const robots = await (await request("/robots.txt", 200)).text();
for (const directive of [
  "User-agent: *",
  "Allow: /",
  "Disallow: /library/",
  "Disallow: /api/",
  "Disallow: /login",
  "Sitemap: https://research.jdranpariya.com/sitemap.xml",
]) {
  if (!robots.split(/\r?\n/u).includes(directive))
    throw new Error(`Robots directive must occupy its own line: ${directive}`);
}
const sitemap = await (await request("/sitemap.xml", 200)).text();
for (const url of [
  "https://research.jdranpariya.com/",
  "https://research.jdranpariya.com/index",
  "https://research.jdranpariya.com/reinforcement-learning/",
  "https://research.jdranpariya.com/neuro-ai/",
  "https://research.jdranpariya.com/bio-inspired/",
  "https://research.jdranpariya.com/ai-for-science/",
]) {
  if (!sitemap.includes(`<loc>${url}</loc>`))
    throw new Error(`Public page missing from sitemap: ${url}`);
}
await request("/assets/research.css", 200);
await request("/assets/research.js", 200);
await request("/nonexistent-research-page", 404);

console.log(`Research smoke checks passed: ${checks}`);
