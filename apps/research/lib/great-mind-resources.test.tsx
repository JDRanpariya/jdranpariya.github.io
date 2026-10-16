import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GreatMindResources } from "../components/great-mind-resources";
import { catalogRecordSchema, type CatalogRecord } from "./research-catalog";
import { filterLibraryRecords } from "./library-data";

const person: CatalogRecord = {
  id: "gm-existing-id",
  collection: "great-minds",
  name: "A researcher",
  entityType: "researcher",
  lead: "",
  institution: "",
  country: "",
  city: "",
  url: "https://archive.example.org/person",
  primary: "Research practice",
  topics: [],
  summary: "A contribution",
  question: "An old inferred question",
  questionBasis: "research_program_inference",
  evidenceUrls: [],
  status: "reflection_verified",
  activity: "Reviewed",
  aliases: ["A different spelling", "Poincaré"],
  perspective: "Describes how to check evidence that conflicts with a favored explanation.",
  perspectiveSourceUrl: "https://archive.example.org/lecture",
  readingPaths: [
    {
      title: "A reflective lecture",
      url: "https://archive.example.org/lecture",
      kind: "lecture",
      yearLabel: "1991",
      whyRead: "For a concrete account of judgment during failed experiments.",
      sourceUrl: "https://archive.example.org/collection",
      accessNote: "Archive description checked; recording available.",
    },
  ],
};

describe("Great Minds reflective reading paths", () => {
  it("renders usable source links and states the basis of limited access", () => {
    catalogRecordSchema.parse(person);
    const html = renderToStaticMarkup(<GreatMindResources record={person} />);
    assert.match(html, /Start with/u);
    assert.match(html, /href="https:\/\/archive.example.org\/lecture"/u);
    assert.match(html, /rel="noopener noreferrer"/u);
    assert.match(html, /Archive description checked; recording available\./u);
    assert.doesNotMatch(html, /An old inferred question/u);
  });

  it("searches approaches, reading titles and alternate names", () => {
    for (const query of [
      "conflicts",
      "reflective lecture",
      "different spelling",
      "failed experiments",
      "Poincare",
    ]) {
      assert.equal(filterLibraryRecords([person], new Map(), { query }).length, 1);
    }
    assert.equal(filterLibraryRecords([person], new Map(), { query: "not present" }).length, 0);
  });
});
