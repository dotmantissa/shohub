import { describe, expect, it } from "vitest";
import {
  APT_REFILL_THRESHOLD_OCTAS,
  APT_TARGET_OCTAS,
  allowedShelbyDomains,
  aptFundingLevels,
  assertAllowedShelbyDomain,
  assertSponsorReserve,
  deriveShelbyAddress,
  fundingTopUp,
  normalizeShelbyAddress,
  normalizeShelbyDomain,
} from "./shelby-funding";

describe("Shelby account funding", () => {
  it("derives the same account as the Shelby Ethereum kit", () => {
    expect(
      deriveShelbyAddress("0xE78FbEe73F0b5D3C62Ca0abbE158F89C71eC25A9", "127.0.0.1:8080"),
    ).toBe("0x82e693125c449ae798e93d8015b643133c4fe9937180422125cd0d13e9dc5aeb");
  });

  it("normalizes addresses and domains before comparing them", () => {
    expect(normalizeShelbyAddress("0x1")).toBe("0x1");
    expect(normalizeShelbyDomain(" Shohub.App ")).toBe("shohub.app");
  });

  it("only enables local domains outside production", () => {
    const production = allowedShelbyDomains({
      appDomain: "shohub.app",
      nodeEnv: "production",
    });
    expect(production.has("shohub.app")).toBe(true);
    expect(production.has("localhost:8080")).toBe(false);

    const development = allowedShelbyDomains({
      appDomain: "shohub.app",
      nodeEnv: "development",
    });
    expect(development.has("localhost:8080")).toBe(true);
    expect(development.has("127.0.0.1:8080")).toBe(true);
  });

  it("rejects unapproved and malformed domains", () => {
    const allowed = new Set(["shohub.app"]);
    expect(() => assertAllowedShelbyDomain("example.com", allowed)).toThrow("not approved");
    expect(() => normalizeShelbyDomain("https://shohub.app/path")).toThrow("invalid");
  });

  it("tops up only after the refill threshold is crossed", () => {
    expect(
      fundingTopUp(APT_REFILL_THRESHOLD_OCTAS, APT_TARGET_OCTAS, APT_REFILL_THRESHOLD_OCTAS),
    ).toBe(0);
    expect(
      fundingTopUp(APT_REFILL_THRESHOLD_OCTAS - 1, APT_TARGET_OCTAS, APT_REFILL_THRESHOLD_OCTAS),
    ).toBe(APT_TARGET_OCTAS - APT_REFILL_THRESHOLD_OCTAS + 1);
  });

  it("keeps enough APT for the SDK fee ceiling and a multi-transaction publish", () => {
    expect(aptFundingLevels(100)).toEqual({
      transactionFeeCeiling: 20_000_000,
      target: 100_000_000,
      refillThreshold: 40_000_000,
    });
    expect(aptFundingLevels(500)).toEqual({
      transactionFeeCeiling: 100_000_000,
      target: 500_000_000,
      refillThreshold: 200_000_000,
    });
  });

  it("rejects invalid gas prices", () => {
    expect(() => aptFundingLevels(0)).toThrow("gas unit price is invalid");
    expect(() => aptFundingLevels(Number.NaN)).toThrow("gas unit price is invalid");
  });

  it("keeps the sponsor reserve untouched", () => {
    expect(() =>
      assertSponsorReserve({
        sponsorBalance: 600,
        transferAmount: 100,
        reserve: 500,
      }),
    ).not.toThrow();
    expect(() =>
      assertSponsorReserve({
        sponsorBalance: 599,
        transferAmount: 100,
        reserve: 500,
      }),
    ).toThrow("temporarily unavailable");
  });
});
