export function safeBlobName(
  projectId: string,
  kind: "cover" | "media" | "metadata",
  fileName?: string,
) {
  const extension = fileName
    ?.split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return `shohub/${projectId}/${kind}${extension ? `.${extension}` : ""}`;
}
