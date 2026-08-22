import { useState } from "react";
import { xAvatarUrl } from "@/lib/x-handle";

export function BuilderAvatar({
  handle,
  name,
  size = "large",
}: {
  handle: string;
  name: string;
  size?: "small" | "large";
}) {
  const [failed, setFailed] = useState(false);
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "B";

  return (
    <span className={`builder-avatar builder-avatar--${size}`} aria-label={`${name} avatar`}>
      {!failed && (
        <img
          src={xAvatarUrl(handle)}
          alt=""
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
        />
      )}
      {failed && <span aria-hidden="true">{initials}</span>}
    </span>
  );
}
