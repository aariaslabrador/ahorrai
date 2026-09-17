import type { PriceSource } from "@/types/database";

export default function PriceSourceBadge({ source }: { source: PriceSource }) {
  if (source === "scraper") {
    return (
      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
        Precio oficial
      </span>
    );
  }
  if (source === "flyer") {
    return (
      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
        Folleto semanal
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
      Reportado por la comunidad
    </span>
  );
}
