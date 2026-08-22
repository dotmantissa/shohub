import { isValidXHandle } from "./x-handle";

export type SubmissionDetails = {
  name: string;
  builder: string;
  xHandle: string;
  builderRole: string;
  teamSize: string;
  location: string;
  builderBio: string;
  description: string;
  githubUrl: string;
  demoUrl: string;
  websiteUrl: string;
  socialUrl: string;
};

export const isHttpUrl = (value: string) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export function submissionValidationError(details: SubmissionDetails): string | null {
  if (!details.name.trim() || details.name.trim().length > 96) {
    return "Give the project a name of up to 96 characters.";
  }
  if (!details.builder.trim() || details.builder.trim().length > 80) {
    return "Tell us who is building it, using up to 80 characters.";
  }
  if (!isValidXHandle(details.xHandle)) {
    return "Add a valid X handle, such as @yourname.";
  }
  if (!details.builderRole.trim() || details.builderRole.trim().length > 80) {
    return "Tell us what the builder or team does.";
  }

  const parsedTeamSize = Number(details.teamSize);
  if (!Number.isInteger(parsedTeamSize) || parsedTeamSize < 1 || parsedTeamSize > 10000) {
    return "Add a team size between 1 and 10,000.";
  }
  if (!details.location.trim() || details.location.trim().length > 80) {
    return "Tell us where the builder or team is based.";
  }
  if (!details.builderBio.trim() || details.builderBio.trim().length > 280) {
    return "Give the builder or team a short introduction.";
  }
  if (!details.description.trim() || details.description.trim().length > 280) {
    return "Keep the project description between 1 and 280 characters.";
  }
  if (
    !isHttpUrl(details.githubUrl.trim()) ||
    !isHttpUrl(details.demoUrl.trim()) ||
    !isHttpUrl(details.websiteUrl.trim()) ||
    !isHttpUrl(details.socialUrl.trim())
  ) {
    return "Links need to start with http or https.";
  }
  return null;
}
