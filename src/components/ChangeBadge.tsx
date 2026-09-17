export default function ChangeBadge({ pct }: { pct: number | null | undefined }) {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) {
    return <span className="text-xs text-muted">—</span>;
  }

  const up = pct >= 0; // el precio ha subido: malo para quien compra
  return (
    <span
      className={`num inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${
        up ? "bg-price-up-soft text-price-up" : "bg-price-down-soft text-price-down"
      }`}
    >
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}
