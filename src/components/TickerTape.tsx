import { createClient } from "@/lib/supabase/server";
import { getWeeklyPriceMoves } from "@/lib/priceHistory";
import { productSymbol } from "@/lib/ticker";

const MAX_ITEMS = 16;

export default async function TickerTape() {
  const supabase = await createClient();
  const moves = await getWeeklyPriceMoves(supabase);

  if (moves.length === 0) {
    return (
      <div className="ticker-wrap">
        <div className="flex items-center gap-2 px-5 py-2.5 text-xs text-[color:var(--board-ink)] opacity-60">
          <span className="h-1.5 w-1.5 rounded-full bg-price-down" />
          Aún no hay suficientes reportes repetidos esta semana para calcular variaciones de precio.
        </div>
      </div>
    );
  }

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
              className="num flex shrink-0 items-center gap-1.5 text-xs"
            >
              <span className="font-bold text-accent-400">{productSymbol(m.product_name)}</span>
              <span className="text-[color:var(--board-ink)]">{m.latest_price.toFixed(2)}€</span>
              <span className={up ? "text-price-up" : "text-price-down"}>
                {up ? "▲" : "▼"} {Math.abs(m.pct_change).toFixed(1)}%
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
