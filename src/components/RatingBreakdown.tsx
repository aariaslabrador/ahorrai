import type { SupermarketRating } from "@/types/database";

const CRITERIA: { key: "avg_cleanliness" | "avg_service" | "avg_organization" | "avg_price"; label: string }[] = [
  { key: "avg_cleanliness", label: "Limpieza" },
  { key: "avg_service", label: "Atención" },
  { key: "avg_organization", label: "Organización" },
  { key: "avg_price", label: "Precio" },
];

function AmenityBadge({ label, pct }: { label: string; pct: number | null }) {
  if (pct === null) {
    return <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-400">{label}: sin datos</span>;
  }
  const yes = pct >= 50;
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        yes ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
      }`}
    >
      {label}: {yes ? "sí" : "no"} ({pct}%)
    </span>
  );
}

export default function RatingBreakdown({ summary }: { summary: SupermarketRating | null | undefined }) {
  if (!summary) return null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-sm font-semibold text-neutral-800">Por criterio</p>
      <div className="mt-3 flex flex-col gap-2">
        {CRITERIA.map((c) => {
          const value = summary[c.key];
          return (
            <div key={c.key} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-neutral-500">{c.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${(value / 5) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs font-medium text-neutral-700">
                {value.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <AmenityBadge label="🐟 Pescadería" pct={summary.fish_counter_pct} />
        <AmenityBadge label="🥩 Carnicería" pct={summary.butcher_pct} />
      </div>
    </div>
  );
}
