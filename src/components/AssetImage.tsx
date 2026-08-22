import { useState } from "react";
import { shelbyBlobUrl } from "@/lib/shelby";
import { ShelbyBadge } from "./ShelbyBadge";

export function AssetImage({
  account,
  blobName,
  alt,
  className,
  showBadge = false,
  onLoadError,
}: {
  account: string;
  blobName: string;
  alt: string;
  className?: string;
  showBadge?: boolean;
  onLoadError?: (reason: "url" | "image") => void;
}) {
  const [loaded, setLoaded] = useState(false);

  const url = shelbyBlobUrl(account, blobName);

  return (
    <div className={`asset-image ${className ?? ""}`}>
      <img
        src={url}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => onLoadError?.("image")}
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
      {showBadge && loaded && (
        <div className="absolute bottom-3 left-3">
          <ShelbyBadge />
        </div>
      )}
    </div>
  );
}
