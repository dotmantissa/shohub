import { describe, expect, it } from "vitest";
import { isValidXHandle, normalizeXHandle, xAvatarUrl, xProfileUrl } from "./x-handle";

describe("X handles", () => {
  it("normalizes common handle formats", () => {
    expect(normalizeXHandle("@shelby")).toBe("shelby");
    expect(normalizeXHandle("https://x.com/shelby?ref=profile")).toBe("shelby");
    expect(normalizeXHandle("twitter.com/shelby")).toBe("shelby");
    expect(normalizeXHandle("https://")).toBe("");
  });

  it("validates X handle limits", () => {
    expect(isValidXHandle("builder_01")).toBe(true);
    expect(isValidXHandle("this-handle-is-not-valid")).toBe(false);
    expect(isValidXHandle("")).toBe(false);
  });

  it("builds public avatar and profile URLs", () => {
    expect(xAvatarUrl("@shelby")).toBe("https://unavatar.io/x/shelby");
    expect(xProfileUrl("@shelby")).toBe("https://x.com/shelby");
  });
});
