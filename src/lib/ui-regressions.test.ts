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

  it("forces dependency optimization when starting the local app", () => {
    const packageJson = source("../../package.json");

    expect(packageJson).toContain('"dev": "vite dev --force"');
  });

  it("keeps sign in clickable while Privy initializes", () => {
    const header = source("../components/SiteHeader.tsx");

    expect(header).not.toContain("disabled={!ready}");
    expect(header).toContain("setLoginRequested(true)");
  });

  it("confirms sign out before ending the email session", () => {
    const header = source("../components/SiteHeader.tsx");

    expect(header).toContain("setSignOutOpen(true)");
    expect(header).toContain("<AlertDialog open={signOutOpen}");
    expect(header).toContain("Leave Shohub?");
    expect(header).toContain("Keep me here");
  });

  it("keeps narrow layouts contained and compact", () => {
    const styles = source("../styles.css");

    expect(styles).toContain("@media (max-width: 480px)");
    expect(styles).toContain(".category-filter");
    expect(styles).toContain("overflow-x: auto");
    expect(styles).toContain(".header-submit span");
    expect(styles).toContain(".project-heading");
  });

  it("stops the showcase background when reduced motion is requested", () => {
    const styles = source("../styles.css");
    const motion = source("../components/ShowcaseMotion.tsx");

    expect(motion).toContain('aria-hidden="true"');
    expect(motion).toContain('role="presentation"');
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain(".showcase-selector");
    expect(styles).toContain("animation: none !important");
  });

  it("keeps the showcase background global and layered behind page content", () => {
    const root = source("../routes/__root.tsx");
    const motion = source("../components/ShowcaseMotion.tsx");
    const styles = source("../styles.css");
    const home = source("../routes/index.tsx");
    const submit = source("../routes/submit.tsx");
    const project = source("../routes/project.$id.tsx");

    expect(root).toContain("<ShowcaseMotion global />");
    expect(root).toContain('className="app-content"');
    expect(motion).toContain("showcase-motion--global");
    expect(motion).toContain("<ShowcaseChain y={300} />");
    expect(motion).toContain("<ShowcaseChain y={600} />");
    expect(styles).toContain(".showcase-motion--global");
    expect(styles).toContain(".app-page");
    expect(home).toContain('className="app-page min-h-screen"');
    expect(submit).toContain('className="app-page min-h-screen"');
    expect(project).toContain('className="app-page min-h-screen"');
  });
});
