import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("interactive UI regressions", () => {
  it("installs browser polyfills before loading the client runtime", () => {
    const client = source("../client.tsx");

    expect(client.indexOf("installBrowserPolyfills()")).toBeLessThan(
      client.indexOf('import("@tanstack/react-start/client")'),
    );
  });

  it("keeps sign in clickable while Privy initializes", () => {
    const header = source("../components/SiteHeader.tsx");

    expect(header).not.toContain("disabled={!ready}");
    expect(header).toContain("setLoginRequested(true)");
  });

  it("keeps narrow layouts contained and compact", () => {
    const styles = source("../styles.css");

    expect(styles).toContain("@media (max-width: 480px)");
    expect(styles).toContain(".category-filter");
    expect(styles).toContain("overflow-x: auto");
    expect(styles).toContain(".header-submit span");
    expect(styles).toContain(".project-heading");
  });
});
