import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { syntheticTicketSeeds, syntheticTicketSummary } from "./index.js";

describe("synthetic ticket fixtures", () => {
  it("contains at least 20 cases", () => {
    assert.ok(syntheticTicketSeeds.length >= 20);
  });

  it("covers required edge case groups", () => {
    const tags = new Set(syntheticTicketSeeds.flatMap((caseItem) => caseItem.tags));

    assert.equal(tags.has("aggressive"), true);
    assert.equal(tags.has("mixed"), true);
    assert.equal(tags.has("ambiguous"), true);
    assert.equal(tags.has("non_english"), true);
  });

  it("keeps summary in sync with fixtures", () => {
    assert.equal(syntheticTicketSummary.total, syntheticTicketSeeds.length);
  });
});
