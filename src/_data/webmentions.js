/**
 * Fetch webmentions from webmention.io at build time.
 * Requires WEBMENTION_API_KEY env var (your webmention.io token).
 * If absent, returns {} so the build never fails.
 *
 * Returns an object keyed by page path:
 *   { '/writings/some-post/': [ ...mentions ] }
 */

const DOMAIN = "jdranpariya.github.io";
const API = "https://webmention.io/api";

export default async function () {
  const token = process.env.WEBMENTION_API_KEY;
  if (!token) {
    console.log("[webmentions] No WEBMENTION_API_KEY - skipping fetch.");
    return {};
  }

  let allMentions = [];
  let page = 0;
  const perPage = 500;

  while (true) {
    const url = `${API}/mentions.jf2?domain=${DOMAIN}&token=${token}&per-page=${perPage}&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[webmentions] Fetch failed: ${res.status}`);
      break;
    }
    const json = await res.json();
    const items = json.children || [];
    allMentions = allMentions.concat(items);
    if (items.length < perPage) break;
    page++;
  }

  console.log(`[webmentions] Fetched ${allMentions.length} mentions.`);

  // Group by path of the target URL
  const byPath = {};
  for (const mention of allMentions) {
    const target = mention["wm-target"] || "";
    let path;
    try {
      path = new URL(target).pathname;
    } catch {
      continue;
    }
    if (!byPath[path]) byPath[path] = [];
    byPath[path].push(mention);
  }

  return byPath;
}
