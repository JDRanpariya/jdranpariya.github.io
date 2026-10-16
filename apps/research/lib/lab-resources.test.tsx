import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LabLead, LabResources } from "../components/lab-resources";
import { LibraryWorkspace } from "../components/library-workspace";
import { filterLibraryRecords } from "./library-data";
import { savedDecision, visibleDecision } from "./library-decisions";
import { catalogRecordSchema, type CatalogRecord } from "./research-catalog";

const record: CatalogRecord = {
  id: "test-lab",
  collection: "rl",
  name: "Test lab",
  entityType: "lab",
  lead: "Ada Example; Ben Example",
  institution: "Test university",
  country: "",
  city: "",
  url: "https://lab.example.org/",
  primary: "",
  topics: [],
  summary: "",
  question: "Old inferred life question?",
  questionBasis: "",
  evidenceUrls: [],
  status: "active",
  activity: "",
  leadSites: [
    {
      name: "Ada Example",
      url: "https://ada.example.org/",
      evidenceUrl: "https://lab.example.org/people",
    },
  ],
  researchPlans: [
    {
      title: "Continual learning research plan",
      url: "https://ada.example.org/plan.pdf",
      author: "Ada Example",
      kind: "plan",
      evidenceUrl: "https://ada.example.org/",
    },
  ],
  teamMembers: [
    {
      name: "Cora Example",
      role: "PhD student",
      personalUrl: "https://cora.example.org/",
      evidenceUrl: "https://lab.example.org/people",
      researchPlans: [],
    },
  ],
  resourcesReview: { status: "partial", checkedAt: "2026-10-13" },
};

describe("lab research resources", () => {
  it("places an exactly attributed plan beside its team member without duplicating it", () => {
    const plan = { ...record.researchPlans![0], author: "Cora Example" };
    const html = renderToStaticMarkup(
      <LabResources
        record={{
          ...record,
          researchPlans: [plan],
          teamMembers: [{ ...record.teamMembers![0], researchPlans: [plan] }],
        }}
      />
    );
    assert.equal((html.match(/Continual learning research plan/gu) ?? []).length, 1);
    assert.doesNotMatch(html, /aria-label="Lab research plans"/u);
    assert.ok(html.indexOf("Cora Example") < html.indexOf("Continual learning research plan"));
  });
  it("links only the verified lead and renders current member sites and authored plans", () => {
    const lead = renderToStaticMarkup(<LabLead record={record} />);
    assert.match(lead, /href="https:\/\/ada.example.org\/"/u);
    assert.equal((lead.match(/<a /gu) ?? []).length, 1);
    assert.match(lead, /Ben Example/u);
    const html = renderToStaticMarkup(<LabResources record={record} />);
    assert.match(html, /Continual learning research plan/u);
    assert.match(html, /href="https:\/\/cora.example.org\/"/u);
    assert.match(html, /Only the team sites and plans verified/u);
  });

  it("searches team identities and plan titles even when neither is in the lab description", () => {
    assert.deepEqual(
      filterLibraryRecords([record], new Map(), { query: "cora" }).map((item) => item.id),
      ["test-lab"]
    );
    assert.deepEqual(
      filterLibraryRecords([record], new Map(), { query: "continual learning research plan" }).map(
        (item) => item.id
      ),
      ["test-lab"]
    );
  });

  it("preserves joint-lead separators and links exact verified team identities", () => {
    const html = renderToStaticMarkup(
      <LabLead
        record={{
          ...record,
          lead: "Ada Example and Cora Example; Ben Example",
          leadSites: [],
          teamMembers: [
            ...record.teamMembers!,
            {
              ...record.teamMembers![0],
              name: "Ada Example",
              personalUrl: "https://ada.example.org/",
            },
          ],
        }}
      />
    );
    assert.equal((html.match(/<a /gu) ?? []).length, 2);
    assert.match(html, /href="https:\/\/ada.example.org\/"/u);
    assert.match(html, /href="https:\/\/cora.example.org\/"/u);
    assert.match(html, /<span[^>]*> and <\/span>/u);
    assert.match(html, /<span[^>]*>; Ben Example<\/span>/u);
  });

  it("links a qualified lead without splitting its parenthetical role or matching a different name", () => {
    const html = renderToStaticMarkup(
      <LabLead
        record={{
          ...record,
          lead: "Ada Example (contact PI; Canada) / Ben Example and Ada Exampleson",
        }}
      />
    );
    assert.equal((html.match(/<a /gu) ?? []).length, 1);
    assert.match(html, /<a[^>]+>Ada Example<\/a>/u);
    assert.match(html, /\(contact PI; Canada\) \/ Ben Example and Ada Exampleson/u);
  });

  it("preserves legacy annotations while displaying them in Unreviewed", () => {
    assert.equal(savedDecision("maybe"), "maybe");
    assert.equal(visibleDecision("maybe"), "unreviewed");
    assert.equal(
      filterLibraryRecords([record], new Map([[record.id, { decision: "maybe" }]]), {
        decision: "unreviewed",
      }).length,
      1
    );
    const html = renderToStaticMarkup(
      <LibraryWorkspace
        collection="rl"
        ownerEmail="owner@example.org"
        initialData={{
          records: [record],
          annotations: [
            {
              recordId: record.id,
              decision: "maybe",
              researchFit: "strong",
              privateNotes: "Existing private note",
              publicNotes: "",
              tags: "",
              isPublished: false,
              updatedAt: "",
            },
          ],
          counts: { unreviewed: 1, keep: 0, maybe: 0, remove: 0 },
          total: 1,
          sourceTotal: 1,
          page: 1,
          pageCount: 1,
        }}
      />
    );
    assert.doesNotMatch(html, /Life question|Fit to my research|>Maybe</u);
    assert.match(html, /Existing private note/u);
    assert.match(html, /<input(?=[^>]*value="unreviewed")(?=[^>]*checked)[^>]*>/u);
  });

  it("rejects unsafe source links in agent-generated resources", () => {
    assert.equal(catalogRecordSchema.safeParse(record).success, true);
    assert.equal(
      catalogRecordSchema.safeParse({
        ...record,
        leadSites: [{ ...record.leadSites![0], url: "javascript:alert(1)" }],
      }).success,
      false
    );
  });
});
