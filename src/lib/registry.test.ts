import { describe, expect, it } from "vitest";
import {
  initializeRegistryPayload,
  registerProjectPayload,
  registryStatusPayload,
} from "./registry";

describe("registry transaction payloads", () => {
  it("builds the initialization entry function", () => {
    expect(initializeRegistryPayload("0xcafe")).toEqual({
      function: "0xcafe::registry::initialize",
      functionArguments: [],
    });
  });

  it("builds the initialization status view", () => {
    expect(registryStatusPayload("0xcafe", "0x123")).toEqual({
      function: "0xcafe::registry::is_initialized",
      functionArguments: ["0x123"],
    });
  });

  it("encodes a project id and preserves registration values", () => {
    const payload = registerProjectPayload({
      address: "0xcafe",
      projectId: "project-1",
      name: "Shohub",
      category: "Storage",
      metadataUri: "https://example.com/metadata.json",
      createdAt: 123,
    });

    expect(payload.function).toBe("0xcafe::registry::register_project");
    expect(payload.functionArguments.slice(1)).toEqual([
      "Shohub",
      "Storage",
      "https://example.com/metadata.json",
      123,
    ]);
    expect(Array.from(payload.functionArguments[0] as Uint8Array)).toEqual(
      Array.from(new TextEncoder().encode("project-1")),
    );
  });
});
