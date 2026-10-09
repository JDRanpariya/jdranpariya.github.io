import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  catalogRecordSchema,
  collectionMeta,
  getCatalog,
  toPublicRecord,
  type CatalogRecord,
} from "./research-catalog";

const root = path.resolve(import.meta.dirname, "..");
const fixtures = path.join(root, "scripts", "fixtures");

function buildFixtureCatalog(): CatalogRecord[] {
  const dir = mkdtempSync(path.join(tmpdir(), "rl-catalog-"));
  const output = path.join(dir, "rl.json");
  try {
    execFileSync(
      "python3",
      [
        path.join(root, "scripts", "build-research-catalogs.py"),
        "--rl-only",
        "--rl-source",
        path.join(fixtures, "rl_census_europe.csv"),
        "--rl-source",
        path.join(fixtures, "rl_census_world.csv"),
        "--rl-output",
        output,
      ],
      { stdio: "pipe" }
    );
    return JSON.parse(readFileSync(output, "utf8")) as CatalogRecord[];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("reinforcement learning catalog", () => {
  const built = buildFixtureCatalog();

  it("is labelled as a lab collection", () => {
    assert.deepEqual(collectionMeta.rl, { label: "Reinforcement learning", noun: "labs" });
  });

  it("merges both census files and drops normalized URL duplicates", () => {
    assert.deepEqual(
      built.map((item) => item.name),
      ["Example Learning Lab", "Sample Agents Group"]
    );
    for (const item of built) {
      catalogRecordSchema.parse(item);
      assert.equal(item.collection, "rl");
      assert.equal(item.status, "active");
      assert.match(item.id, /^rl-[0-9a-f]{14}$/u);
    }
  });

  it("maps census columns onto catalog fields", () => {
    const [lab, group] = built;
    assert.equal(lab.entityType, "lab");
    assert.equal(lab.lead, "Ada Example");
    assert.equal(lab.primary, "model-based RL");
    assert.deepEqual(lab.topics, ["model-based RL", "exploration"]);
    assert.equal(lab.questionBasis, "Test basis.");
    assert.deepEqual(lab.evidenceUrls, [
      "https://example.org/paper-1",
      "https://example.org/paper-2",
    ]);
    assert.equal(lab.activity, "2026-09");
    assert.equal(lab.elite, true);
    assert.deepEqual(group.topics, ["continual RL", "reward design"]);
    assert.equal(group.elite, false);
  });

  it("generates stable ids across builds", () => {
    assert.deepEqual(
      buildFixtureCatalog().map((item) => item.id),
      built.map((item) => item.id)
    );
  });

  it("strips private fields before records leave the Worker", () => {
    const published = toPublicRecord(built[0]) as Record<string, unknown>;
    for (const field of ["elite", "evidenceUrls", "activity"]) {
      assert.equal(field in published, false, field);
    }
    assert.equal(published.question, "Test question?");
  });

  it("bundles a valid generated catalog (empty until the census lands)", () => {
    const catalog = getCatalog("rl");
    for (const item of catalog) {
      catalogRecordSchema.parse(item);
      assert.equal(item.collection, "rl");
    }
    assert.equal(new Set(catalog.map((item) => item.id)).size, catalog.length);
  });
});
