import { describe, expect, it } from "vitest";
import { safeBlobName } from "./blob-names";

describe("safeBlobName", () => {
  it("keeps project assets together and preserves a safe extension", () => {
    expect(safeBlobName("project-1", "cover", "My Cover.PNG")).toBe("shohub/project-1/cover.png");
  });

  it("removes unsafe extension characters", () => {
    expect(safeBlobName("project-1", "media", "demo.PdF?")).toBe("shohub/project-1/media.pdf");
  });

  it("does not add an extension when the source has no filename", () => {
    expect(safeBlobName("project-1", "metadata")).toBe("shohub/project-1/metadata");
  });
});
