import { createHash } from "node:crypto";

export function createContentHash(value) {
  return createHash("sha256").update(normalizeContent(value)).digest("hex");
}

export function normalizeContent(value) {
  return String(value).replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}
