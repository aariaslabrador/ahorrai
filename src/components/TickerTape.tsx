import { createClient } from "@/lib/supabase/server";
import { getWeeklyPriceMoves } from "@/lib/priceHistory";
import { productSymbol } from "@/lib/ticker";

const MAX_ITEMS = 16;

export default async function TickerTape() {
  const supabase = await createClient();
  const moves = await getWeeklyPriceMoves(supabase);

  if (moves.length === 0) return null;

  const items = [...moves]
    .sort((a, b) => Math.abs(b.pct_change) - Math.abs(a.pct_change))
    .slice(0, MAX_ITEMS);

  // Se duplica la lista para que la animación de la cinta sea un bucle continuo.
  const track = [...items, ...items];

  return (
    <div className="ticker-wrap" aria-hidden="true">
      <div className="ticker-track">
        {track.map((m, i) => {
          const up = m.pct_change >= 0;
          return (
            <span
              key={`${m.product_id}::${m.supermarket_id}::${i}`}
              className="flex shrink-0 items-center gap-1.5 font-mono text-xs"
            >
              <span className="font-bold text-accent-400">{productSymbol(m.product_name)}</span>
              <span className="text-neutral-300">{m.latest_price.toFixed(2)}€</span>
              <span className={up ? "text-red-400" : "text-emerald-400"}>
                {up ? "▲" : "▼"} {Math.abs(m.pct_change).toFixed(1)}%
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
