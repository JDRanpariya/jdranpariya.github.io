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
  index.includes("privateNotes")
) {
  throw new Error("The selected index is missing or contains private fields.");
}
if (!index.includes('data-domains="research.jdranpariya.com"')) {
  throw new Error("The selected index is missing public analytics.");
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
await request("/api/library/annotations?collection=great-minds", 401);
await request("/api/library/annotations?collection=neuroai", 401);
await request("/robots.txt", 200);
await request("/sitemap.xml", 200);
await request("/assets/research.css", 200);
await request("/assets/research.js", 200);
await request("/nonexistent-research-page", 404);

console.log(`Research smoke checks passed: ${checks}`);
