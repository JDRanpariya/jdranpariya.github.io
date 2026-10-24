// Validate built metadata, not just source templates. Run after the production build.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const site = JSON.parse(readFileSync("src/_data/site.json", "utf8"));
const manifest = JSON.parse(readFileSync("build/assets/logo/site.webmanifest", "utf8"));
assert.equal(manifest.name, site.name);
assert.equal(manifest.description, site.description);
for (const icon of manifest.icons)
  assert.ok(existsSync(`build${icon.src}`), `Missing manifest icon: ${icon.src}`);

function checkDirectory(directory, research = false) {
  let count = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) count += checkDirectory(path, research);
    else if (entry.name.endsWith(".html")) {
      const html = readFileSync(path, "utf8");
      // Auth shells, redirects, demos, and sandbox previews do not use public metadata.
      if (!html.includes('property="og:site_name"')) continue;
      assert.ok(!html.includes('content="JD Ranpariya"'), `Old social identity in ${path}`);
      assert.ok(!html.includes("master&#39;s student in Erlangen"), `Old biography in ${path}`);
      const description = html.match(/<meta name="description" content="([^"]*)"/u)?.[1];
      const socialDescription = html.match(
        /<meta property="og:description" content="([^"]*)"/u
      )?.[1];
      assert.ok(description, `Missing description: ${path}`);
      assert.equal(socialDescription, description, `Inconsistent descriptions: ${path}`);
      const image = html.match(/<meta property="og:image" content="([^"]*)"/u)?.[1];
      assert.ok(image?.startsWith(site.url), `Missing absolute social image: ${path}`);
      if (!research)
        assert.ok(existsSync(`build${new URL(image).pathname}`), `Missing social image: ${path}`);
      for (const match of html.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gu
      )) {
        const data = JSON.parse(match[1]);
        assert.ok(data.description, `Missing structured description: ${path}`);
        assert.ok(
          !/&#39;|&quot;|&amp;/u.test(JSON.stringify(data)),
          `HTML entities in JSON-LD: ${path}`
        );
        assert.ok(
          !JSON.stringify(data).includes("JD Ranpariya"),
          `Old structured identity: ${path}`
        );
      }
      count++;
    }
  }
  return count;
}
const count = checkDirectory("build");
for (const path of ["build/index.html", "build/about/index.html"]) {
  assert.ok(
    readFileSync(path, "utf8").includes(site.description),
    `Shared description missing: ${path}`
  );
}
const feed = readFileSync("build/feed.xml", "utf8");
assert.ok(feed.includes(`<title>${site.name}</title>`));
assert.ok(feed.includes(site.description));
assert.ok(!feed.includes("JD Ranpariya"));
const researchCount = process.argv.includes("--research")
  ? checkDirectory("apps/research/_site", true)
  : 0;
console.log(
  `Metadata checks passed: ${count} personal pages, ${researchCount} research pages, RSS, manifest, and image files.`
);
