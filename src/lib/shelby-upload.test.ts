import { AccountAddress } from "@aptos-labs/ts-sdk";
import { ShelbyBlobClient } from "@shelby-protocol/sdk/browser";
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

  it("puts expiration in the live Shelbynet batch registration position", () => {
    const expirationMicros = blobExpirationMicros(1_700_000_000_123);
    const payload = ShelbyBlobClient.createBatchRegisterBlobsPayload({
      account: AccountAddress.from("0x1"),
      expirationMicros,
      blobs: [
        {
          blobName: "project/cover.png",
          blobSize: 128,
          blobMerkleRoot: `0x${"00".repeat(32)}`,
          numChunksets: 1,
        },
      ],
      encoding: 0,
    });

    expect(payload.functionArguments[3]).toBe(expirationMicros);
    expect(Array.isArray(payload.functionArguments[4])).toBe(true);
  });
});
