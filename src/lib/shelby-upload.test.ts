import { describe, expect, it } from "vitest";
import { BLOB_LIFETIME_MICROS, blobExpirationMicros } from "./shelby-upload";

describe("Shelby upload lifetime", () => {
  it("sets expiration 30 days after the supplied time", () => {
    const nowMillis = Date.UTC(2026, 7, 22);

    expect(blobExpirationMicros(nowMillis)).toBe(nowMillis * 1000 + BLOB_LIFETIME_MICROS);
  });

  it("returns an integer microsecond timestamp", () => {
    expect(Number.isSafeInteger(blobExpirationMicros(1_700_000_000_123))).toBe(true);
  });
});
