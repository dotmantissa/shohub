import { Zap } from "lucide-react";

export function ShelbyBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`shelby-badge ${className}`}>
      <Zap aria-hidden="true" className="h-3.5 w-3.5" /> Served via Shelby
    </span>
  );
}
