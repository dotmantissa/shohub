import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { installBrowserPolyfills } from "./lib/browser-polyfills";

installBrowserPolyfills();

void import("@tanstack/react-start/client").then(({ StartClient }) => {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <StartClient />
      </StrictMode>,
    );
  });
});
