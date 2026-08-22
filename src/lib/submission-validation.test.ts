import { describe, expect, it } from "vitest";
import {
  isHttpUrl,
  submissionValidationError,
  type SubmissionDetails,
} from "./submission-validation";

const validDetails: SubmissionDetails = {
  name: "Shelf Search",
  builder: "Shelf Search Studio",
  xHandle: "@shelfsearch",
  builderRole: "Product studio",
  teamSize: "3",
  location: "Lagos, Nigeria",
  builderBio: "We build tools that make stored media easier to discover.",
  description: "A visual search layer for public project media stored on Shelby.",
  githubUrl: "https://github.com/example/shelf-search",
  demoUrl: "https://example.com/demo",
  websiteUrl: "",
  socialUrl: "",
};

describe("submission validation", () => {
  it("accepts complete builder and project details", () => {
    expect(submissionValidationError(validDetails)).toBeNull();
  });

  it.each([
    ["name", "Give the project a name"],
    ["builder", "Tell us who is building it"],
    ["xHandle", "Add a valid X handle"],
    ["builderRole", "Tell us what the builder or team does"],
    ["location", "Tell us where the builder or team is based"],
    ["builderBio", "Give the builder or team a short introduction"],
    ["description", "Keep the project description"],
  ] as const)("keeps %s mandatory", (field, message) => {
    expect(submissionValidationError({ ...validDetails, [field]: "" })).toContain(message);
  });

  it.each(["0", "1.5", "10001", "many"])("rejects an invalid team size of %s", (teamSize) => {
    expect(submissionValidationError({ ...validDetails, teamSize })).toContain("team size");
  });

  it("accepts empty optional links and rejects unsafe link protocols", () => {
    expect(isHttpUrl("")).toBe(true);
    expect(isHttpUrl("https://shohub.app")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(
      submissionValidationError({ ...validDetails, demoUrl: "javascript:alert(1)" }),
    ).toContain("http or https");
  });
});
