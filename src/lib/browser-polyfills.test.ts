import { describe, expect, it } from "vitest";
import { Buffer as BrowserBuffer } from "buffer";
import { installBrowserPolyfills } from "./browser-polyfills";

describe("browser polyfills", () => {
  it("installs Buffer when a browser runtime does not provide it", () => {
    const target = { Buffer: undefined } as unknown as typeof globalThis;

    installBrowserPolyfills(target);

    expect(target.Buffer).toBe(BrowserBuffer);
    expect(target.Buffer.from("Shohub").toString("base64")).toBe("U2hvaHVi");
  });

  it("does not replace an existing Buffer implementation", () => {
    const existing = { from: () => "existing" };
    const target = { Buffer: existing } as unknown as typeof globalThis;

    installBrowserPolyfills(target);

    expect(target.Buffer).toBe(existing);
  });
});
