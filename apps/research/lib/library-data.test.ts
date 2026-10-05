import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterLibraryRecords } from "./library-data";
import {
  catalogRecordSchema,
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

  it("match the catalog schema with unique ids", () => {
    for (const collection of ["great-minds", "neuroai"] as const) {
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
    const people = neuroai.filter((item) => item.status === "ADDITIONAL_RESEARCHER");
    assert.equal(neuroai.length, 487);
    assert.equal(people.length, 65);
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
