import { describe, expect, it } from "vitest";
import { nextTheme, resolveTheme } from "./theme";

describe("theme preferences", () => {
  it("uses a stored preference before the system preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("defaults to light when no preference has been saved", () => {
    expect(resolveTheme(null, true)).toBe("light");
    expect(resolveTheme(null, false)).toBe("light");
  });

  it("always switches to the opposite theme", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
  });
});
