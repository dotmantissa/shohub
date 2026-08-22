import { DatabaseZap } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-mark">
      <span className="brand-mark__icon" aria-hidden="true">
        <DatabaseZap size={compact ? 17 : 20} strokeWidth={2.4} />
      </span>
      {!compact && <span className="brand-mark__name">Shohub</span>}
    </span>
  );
}
