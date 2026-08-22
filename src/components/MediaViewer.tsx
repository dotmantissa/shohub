import { useState } from "react";
import { toast } from "sonner";
import { shelbyBlobUrl } from "@/lib/shelby";
import { ShelbyBadge } from "./ShelbyBadge";

export function MediaViewer({
  account,
  blobName,
  kind,
}: {
  account: string;
  blobName: string;
  kind: "video" | "pdf";
}) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const url = shelbyBlobUrl(account, blobName);

  const handleMediaError = () => {
    setFailed(true);
    toast.error(`${kind === "video" ? "Demo video" : "PDF"} failed to load from Shelby.`);
  };

  if (failed) {
    return (
      <div className="media-fallback">
        This {kind === "video" ? "video" : "PDF"} couldn't be loaded from Shelby.
      </div>
    );
  }

  return (
    <div className="relative">
      {kind === "video" ? (
        <video
          src={url}
          controls
          onLoadedData={() => setReady(true)}
          onError={handleMediaError}
          className="w-full rounded-2xl bg-black"
        />
      ) : (
        <iframe
          src={url}
          title="Project PDF"
          onLoad={() => setReady(true)}
          onError={handleMediaError}
          className="h-[70vh] w-full rounded-lg border border-border bg-card"
        />
      )}
      {ready && (
        <div className="absolute bottom-3 right-3">
          <ShelbyBadge />
        </div>
      )}
    </div>
  );
}
