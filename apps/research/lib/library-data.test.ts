import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { filterLibraryRecords } from "./library-data";
import {
  catalogRecordSchema,
  collectionIds,
  getCatalog,
  toPublicRecord,
  type CatalogRecord,
} from "./research-catalog";

function record(id: string, extra: Partial<CatalogRecord> = {}): CatalogRecord {
  return {
    id,
    collection: "neuroai",
    name: `Record ${id}`,
    entityType: "lab",
    lead: "",
    institution: "",
    country: "",
    city: "",
    url: `https://example.org/${id}`,
    primary: "",
    topics: [],
    summary: "",
    question: "",
    questionBasis: "",
    evidenceUrls: [],
    status: "",
    activity: "",
    ...extra,
  };
}

const sample = [
  record("a", { elite: true, fit: "strong", tier: "1", name: "Replay lab" }),
  record("b", { elite: true, fit: "partial", tier: "" }),
  record("c", { elite: false, fit: "strong", tier: "2", position: "Professor — Groningen" }),
  record("d", { elite: false, fit: "", tier: "" }),
  record("e"),
];
const ids = (records: CatalogRecord[]) => records.map((item) => item.id).join("");

describe("library filters", () => {
  it("returns everything with no filters", () => {
    assert.equal(ids(filterLibraryRecords(sample, new Map())), "abcde");
  });

  it("filters decisions and searchable catalog details without searching hidden triage", () => {
    const saved = new Map([["c", { decision: "keep" }]]);
    assert.equal(ids(filterLibraryRecords(sample, saved, { decision: "keep" })), "c");
    assert.equal(ids(filterLibraryRecords(sample, saved, { decision: "unreviewed" })), "abde");
    assert.equal(ids(filterLibraryRecords(sample, new Map(), { query: "groningen" })), "");
    assert.equal(ids(filterLibraryRecords(sample, new Map(), { query: "replay" })), "a");
  });
});

describe("generated catalogs", () => {
  const neuroai = getCatalog("neuroai");
  const reviewedPath = new URL("../data/source/reviewed-census-v3.json", import.meta.url);
  const reviewed = existsSync(reviewedPath)
    ? (JSON.parse(readFileSync(reviewedPath, "utf8")) as {
        catalogs: Partial<Record<string, CatalogRecord[]>>;
      })
    : null;
  const membership: { id: string; decision: string; destinationId: string | null }[] = JSON.parse(
    readFileSync(new URL("../data/source/catalog-membership.json", import.meta.url), "utf8")
  );

  it("match the catalog schema with unique ids", () => {
    for (const collection of collectionIds) {
      const catalog = getCatalog(collection);
      for (const item of catalog) catalogRecordSchema.parse(item);
      assert.equal(new Set(catalog.map((item) => item.id)).size, catalog.length);
    }
  });

  it("keeps existing NeuroAI ids without importing private outreach details", () => {
    const clopath = neuroai.find((item) => item.id === "R0449");
    assert.equal(clopath?.lead, "Claudia Clopath");
    assert.equal(clopath?.fit, undefined);
    assert.equal(clopath?.tier, undefined);
    assert.equal(clopath?.contactRule, undefined);
  });

  it("adds public directory people without private triage", () => {
    if (reviewed?.catalogs.neuroai) {
      assert.equal(neuroai.length, reviewed.catalogs.neuroai.length);
      for (const person of neuroai.filter((item) => item.id.startsWith("ep-"))) {
        assert.ok(person.activity.length > 0, `${person.id}: current programme evidence`);
        assert.ok(person.evidenceUrls.length >= 2, `${person.id}: source-backed programme`);
        assert.ok(["CORE", "STRONGLY_RELATED"].includes(person.status));
      }
      return;
    }
    const people = neuroai.filter((item) => item.status === "ADDITIONAL_RESEARCHER");
    const removed = membership.filter((row) => row.decision !== "keep");
    assert.equal(neuroai.length, 487 - removed.length);
    assert.equal(people.length, 65 - removed.filter((row) => row.id.startsWith("ep-")).length);
    for (const person of people) {
      assert.match(person.id, /^ep-[0-9a-f]{14}$/u);
      assert.equal(person.entityType, "researcher");
      assert.equal(person.fit, undefined);
      assert.equal(person.tier, undefined);
      assert.equal(person.recruiting, undefined);
      assert.equal(person.contactRule, undefined);
      assert.equal(person.position, undefined);
      assert.deepEqual(person.evidenceUrls, []);
    }
  });

  it("excludes reviewed NeuroAI mismatches and resolves RL moves without new identities", () => {
    const retained = new Set(neuroai.map((row) => row.id));
    const rlIds = new Set(getCatalog("rl").map((row) => row.id));
    for (const decision of membership) {
      if (!reviewed?.catalogs.neuroai) {
        assert.equal(retained.has(decision.id), decision.decision === "keep");
      }
      if (decision.decision === "move_rl") {
        assert.ok(decision.destinationId && rlIds.has(decision.destinationId));
      }
    }
    assert.ok(!retained.has("ep-1537a500ad1b38"));
    assert.ok(!retained.has("ep-7109e63d3c9a74"));
    assert.ok(rlIds.has("rl-bd9c33d4878cc2"));
    assert.ok(rlIds.has("rl-cf924860203864"));
  });

  it("contains no private triage fields in the committed catalogs", () => {
    for (const item of neuroai) {
      for (const field of ["elite", "fit", "tier", "recruiting", "contactRule", "position"]) {
        assert.equal(field in item, false, `${item.id} has ${field}`);
      }
    }
  });

  it("strips private triage fields from public records", () => {
    const privateRecord = record("private", {
      fit: "strong",
      tier: "1",
      contactRule: "private",
      evidenceUrls: ["https://example.org/evidence"],
      activity: "private",
    });
    const published = toPublicRecord(privateRecord) as Record<string, unknown>;
    for (const field of [
      "elite",
      "fit",
      "tier",
      "recruiting",
      "contactRule",
      "position",
      "evidenceUrls",
      "activity",
    ]) {
      assert.equal(field in published, false, field);
    }
    assert.equal(published.name, privateRecord.name);
  });
});
