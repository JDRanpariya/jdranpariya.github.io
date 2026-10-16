import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { inheritMovedAnnotations } from "./catalog-membership";

describe("catalog moves preserve annotations", () => {
  const moves = [{ sourceId: "old", destinationId: "new" }];
  const source = [
    {
      recordId: "old",
      collection: "neuroai",
      privateNotes: "My exact note",
      decision: "maybe",
      researchFit: "strong",
    },
  ];

  it("inherits the original note and triage without changing its stored identity", () => {
    const [inherited] = inheritMovedAnnotations([], source, moves);
    assert.deepEqual(inherited, { ...source[0], recordId: "new", collection: "rl" });
    assert.equal(source[0].recordId, "old");
    assert.equal(source[0].collection, "neuroai");
  });

  it("honors a destination unpublish decision before public filtering", () => {
    const oldPublic = [{ ...source[0], decision: "keep", isPublished: true }];
    const unpublished = [
      { ...oldPublic[0], collection: "rl", recordId: "new", isPublished: false },
    ];
    const visible = inheritMovedAnnotations(unpublished, oldPublic, moves).filter(
      (row) => row.isPublished && row.decision === "keep"
    );
    assert.deepEqual(visible, []);
  });

  it("never overwrites an edited destination or duplicates it", () => {
    const destination = [
      {
        ...source[0],
        collection: "rl",
        recordId: "new",
        privateNotes: "Newer edit",
        decision: "remove",
      },
    ];
    assert.deepEqual(inheritMovedAnnotations(destination, source, moves), destination);
  });
});
