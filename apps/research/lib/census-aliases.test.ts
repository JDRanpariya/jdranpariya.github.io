import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { inheritCensusAnnotations } from "./census-aliases";

describe("duplicate identities preserve saved annotations", () => {
  const aliases = [{ collection: "neuroai", sourceId: "duplicate", destinationId: "original" }];
  const source = {
    collection: "neuroai",
    recordId: "duplicate",
    privateNotes: "Exact notes",
    decision: "keep",
    isPublished: true,
  };
  it("inherits a hidden alias without changing the stored row or another collection", () => {
    const other = { ...source, collection: "rl" };
    assert.deepEqual(inheritCensusAnnotations([source, other], aliases), [
      other,
      { ...source, recordId: "original" },
    ]);
    assert.equal(source.recordId, "duplicate");
  });
  it("honors the destination's removal and unpublish decision", () => {
    const destination = {
      ...source,
      recordId: "original",
      privateNotes: "Updated",
      decision: "remove",
      isPublished: false,
    };
    const resolved = inheritCensusAnnotations([source, destination], aliases);
    assert.deepEqual(resolved, [destination]);
    assert.deepEqual(
      resolved.filter((row) => row.isPublished && row.decision === "keep"),
      []
    );
  });
});
