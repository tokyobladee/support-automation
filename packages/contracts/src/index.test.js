import { describe, expect, it } from "vitest";
import { ticketIntakeSchema } from "./index.js";

describe("ticket intake schema", () => {
  it("normalizes valid manual input", () => {
    const result = ticketIntakeSchema.parse({
      text: " I need help with my subscription "
    });

    expect(result).toEqual({
      text: "I need help with my subscription",
      source: "manual"
    });
  });

  it("rejects empty ticket text", () => {
    expect(() => ticketIntakeSchema.parse({ text: " " })).toThrow();
  });
});
