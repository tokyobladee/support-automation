import { describe, expect, it } from "vitest";
import { syntheticTicketSeeds, syntheticTicketSummary } from "./index.js";

describe("synthetic ticket fixtures", () => {
  it("contains at least 20 cases", () => {
    expect(syntheticTicketSeeds.length).toBeGreaterThanOrEqual(20);
  });

  it("covers required edge case groups", () => {
    const tags = new Set(syntheticTicketSeeds.flatMap((caseItem) => caseItem.tags));

    expect(tags.has("aggressive")).toBe(true);
    expect(tags.has("mixed")).toBe(true);
    expect(tags.has("ambiguous")).toBe(true);
    expect(tags.has("non_english")).toBe(true);
  });

  it("keeps summary in sync with fixtures", () => {
    expect(syntheticTicketSummary.total).toBe(syntheticTicketSeeds.length);
  });
});
