const X_HANDLE_PATTERN = /^[A-Za-z0-9_]{1,15}$/;

export function normalizeXHandle(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const withoutAt = trimmed.replace(/^@/, "");
  let candidate = withoutAt;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      candidate = new URL(trimmed).pathname.split("/").filter(Boolean)[0] ?? "";
    } catch {
      return "";
    }
  } else {
    candidate = withoutAt.replace(/^(www\.)?(x|twitter)\.com\//i, "").split(/[/?#]/)[0];
  }

  return candidate.replace(/^@/, "").trim();
}

export function isValidXHandle(value: string) {
  return X_HANDLE_PATTERN.test(normalizeXHandle(value));
}

export function xAvatarUrl(handle: string) {
  return `https://unavatar.io/x/${encodeURIComponent(normalizeXHandle(handle))}`;
}

export function xProfileUrl(handle: string) {
  return `https://x.com/${encodeURIComponent(normalizeXHandle(handle))}`;
}
