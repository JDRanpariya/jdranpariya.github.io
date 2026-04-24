#!/usr/bin/env bun
// Post-build smoke test. Fails with non-zero exit if any assertion breaks.
// Run after `bun run build:prod`.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const BUILD = "build";
let failures = 0;

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  failures++;
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

// 1. Required pages exist
console.log("\n[1] required pages exist");
const required = [
  "index.html",
  "about/index.html",
  "writings/index.html",
  "library/index.html",
  "projects/index.html",
  "odysseys/index.html",
  "now/index.html",
  "guestbook/index.html",
  "404.html",
  "sitemap.xml",
  "feed.xml",
  "robots.txt",
];
for (const p of required) {
  const full = join(BUILD, p);
  if (existsSync(full) && statSync(full).size > 0) {
    ok(`${p}`);
  } else {
    fail(`missing or empty: ${p}`);
  }
}

// 2. Sitemap is valid XML and contains expected URLs
console.log("\n[2] sitemap.xml");
try {
  const sitemap = readFileSync(join(BUILD, "sitemap.xml"), "utf8");
  if (!sitemap.trimStart().startsWith("<?xml")) fail("sitemap missing XML declaration");
  else ok("has <?xml declaration");

  const expectedUrls = ["/about/", "/writings/", "/library/", "/projects/", "/now/"];
  for (const u of expectedUrls) {
    if (sitemap.includes(u)) ok(`contains ${u}`);
    else fail(`sitemap missing URL: ${u}`);
  }

  const locCount = (sitemap.match(/<loc>/g) || []).length;
  if (locCount < 10) fail(`sitemap has only ${locCount} <loc> entries (expected ≥ 10)`);
  else ok(`${locCount} <loc> entries`);

  if (sitemap.includes("/now/updates/"))
    fail("sitemap contains /now/updates/ (should be filtered)");
  else ok("no /now/updates/ leakage");
} catch (e) {
  fail(`could not read sitemap.xml: ${e.message}`);
}

// 3. Feed is valid Atom XML
console.log("\n[3] feed.xml");
try {
  const feed = readFileSync(join(BUILD, "feed.xml"), "utf8");
  if (!feed.trimStart().startsWith("<?xml")) fail("feed missing XML declaration");
  else ok("has <?xml declaration");
  if (!feed.includes('<feed xmlns="http://www.w3.org/2005/Atom"'))
    fail("feed missing Atom namespace");
  else ok("has Atom namespace");
  if (!feed.includes("<entry>"))
    console.log("  ⚠ no <entry> elements (OK if no published writings)");
} catch (e) {
  fail(`could not read feed.xml: ${e.message}`);
}

// 4. No unrendered template tokens leaked into HTML
console.log("\n[4] no template leakage");
const htmlFiles = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (name.endsWith(".html")) htmlFiles.push(full);
  }
}
walk(BUILD);

const tokenPattern = /\{\{[^}]+\}\}|\{%[^%]+%\}/;
const undefinedPattern = /\bundefined\b/;
let leaked = 0;
let undefinedHits = 0;
for (const f of htmlFiles) {
  const content = readFileSync(f, "utf8");
  if (tokenPattern.test(content)) {
    fail(`unrendered token in ${f.replace(BUILD + "/", "")}`);
    leaked++;
    if (leaked > 5) {
      console.error("  … (more suppressed)");
      break;
    }
  }
}
if (leaked === 0) ok(`${htmlFiles.length} HTML files, no {{ }} or {% %} leakage`);

// "undefined" is noisier (legit word in prose) — only flag in <title> or meta
for (const f of htmlFiles) {
  const content = readFileSync(f, "utf8");
  const titleMatch = content.match(/<title>([^<]*)<\/title>/);
  if (titleMatch && undefinedPattern.test(titleMatch[1])) {
    fail(`"undefined" in <title> of ${f.replace(BUILD + "/", "")}`);
    undefinedHits++;
  }
  const descMatch = content.match(/<meta name="description" content="([^"]*)"/);
  if (descMatch && undefinedPattern.test(descMatch[1])) {
    fail(`"undefined" in meta description of ${f.replace(BUILD + "/", "")}`);
    undefinedHits++;
  }
}
if (undefinedHits === 0) ok("no 'undefined' in <title> or meta description");

// Summary
console.log("");
if (failures > 0) {
  console.error(`✗ smoke test FAILED: ${failures} assertion(s) broken`);
  process.exit(1);
} else {
  console.log(`✓ smoke test PASSED`);
}
