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
  !home.includes("research-home-data")
) {
  throw new Error("The public research page is missing its content or hydration data.");
}
if (!home.includes('data-domains="research.jdranpariya.com"')) {
  throw new Error("The research homepage is missing public analytics.");
}

const index = await (await request("/index", 200)).text();
if (
  !index.includes("Research index") ||
  !index.includes('id="index-data"') ||
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
  "Safety and trust",
  "Learning on real systems",
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
const paperUrls = [...rlSource.matchAll(/^\s*- \[[^\]]+\]\((https:\/\/[^)]+)\)/gmu)].map(
  (match) => match[1]
);
for (const url of paperUrls) {
  if (!rl.includes(`href="${url}"`))
    throw new Error(`RL paper link missing from public HTML: ${url}`);
}
if (!rl.includes('data-domains="research.jdranpariya.com"')) {
  throw new Error("The RL page is missing public analytics.");
}
for (const html of [home, index, rl]) {
  if (!html.includes('href="/reinforcement-learning/"'))
    throw new Error("Public RL navigation missing.");
}
await request("/reinforcement-learning", 301);
await request("/reinforcement-learning/index.html", 301);
for (const href of [
  "/library/great-minds",
  "/library/neuroai",
  "/library/rl",
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
await request("/api/library/annotations?collection=great-minds", 401);
await request("/api/library/annotations?collection=neuroai", 401);
await request("/api/library/annotations?collection=rl", 401);
await request("/robots.txt", 200);
const sitemap = await (await request("/sitemap.xml", 200)).text();
for (const url of [
  "https://research.jdranpariya.com/",
  "https://research.jdranpariya.com/index",
  "https://research.jdranpariya.com/reinforcement-learning/",
]) {
  if (!sitemap.includes(`<loc>${url}</loc>`))
    throw new Error(`Public page missing from sitemap: ${url}`);
}
await request("/assets/research.css", 200);
await request("/assets/research.js", 200);
await request("/nonexistent-research-page", 404);

console.log(`Research smoke checks passed: ${checks}`);
