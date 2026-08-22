import { Buffer as BrowserBuffer } from "buffer";

declare global {
  var Buffer: typeof BrowserBuffer;
}

export function installBrowserPolyfills(target: typeof globalThis = globalThis) {
  if (typeof target.Buffer === "undefined") {
    target.Buffer = BrowserBuffer;
  }
}
