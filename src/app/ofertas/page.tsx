import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AddToBasketButton from "@/components/AddToBasketButton";
import PriceSourceBadge from "@/components/PriceSourceBadge";
import ChangeBadge from "@/components/ChangeBadge";
import Sparkline from "@/components/Sparkline";
import { getWeeklyPriceMoves } from "@/lib/priceHistory";
import { productSymbol } from "@/lib/ticker";

export default async function OfertasPage({
  searchParams,
}: {
  searchParams: Promise<{ ciudad?: string; q?: string }>;
}) {
  const { ciudad, q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("latest_prices")
    .select("*")
    .order("price", { ascending: true })
    .limit(60);

  if (ciudad) query = query.ilike("supermarket_city", ciudad);
  if (q) query = query.ilike("product_name", `%${q}%`);

  const [{ data: prices }, { data: cityRows }, moves] = await Promise.all([
    query,
    supabase.from("supermarkets").select("city"),
    getWeeklyPriceMoves(supabase),
  ]);
  const cities = Array.from(new Set((cityRows ?? []).map((c) => c.city))).sort();
  const moveByPair = new Map(moves.map((m) => [`${m.product_id}::${m.supermarket_id}`, m]));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-foreground">Cotizaciones</h1>
      <p className="mt-1 text-sm text-muted">
        Último precio reportado de cada producto y su variación en los últimos 7 días.
      </p>

      <form className="mt-4 flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar producto..."
          className="flex-1 min-w-[180px] rounded-lg border border-line px-3 py-2 text-sm"
        />
        <select
          name="ciudad"
          defaultValue={ciudad ?? ""}
          className="rounded-lg border border-line px-3 py-2 text-sm"
        >
          <option value="">Todas las ciudades</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-surface-2"
        >
          Buscar
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-line bg-surface">
        <div className="hidden grid-cols-[1.7fr_1fr_auto_auto_auto] gap-3 border-b border-line px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-muted sm:grid">
          <span>Producto</span>
          <span>Mercado</span>
          <span className="text-right">Último</span>
          <span className="text-right">Var.</span>
          <span />
        </div>
        <ul className="divide-y divide-line">
          {(prices ?? []).map((p) => {
            const move = moveByPair.get(`${p.product_id}::${p.supermarket_id}`);
            return (
              <li
                key={p.id}
                className="grid grid-cols-2 items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[1.7fr_1fr_auto_auto_auto]"
              >
                <div className="col-span-2 sm:col-span-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-accent-600">
                      {productSymbol(p.product_name)}
                    </span>
                    <p className="font-medium text-foreground">{p.product_name}</p>
                    <PriceSourceBadge source={p.source} />
                  </div>
                  {p.product_brand && <p className="text-xs text-muted">{p.product_brand}</p>}
                </div>

                <Link
                  href={`/supermercados/${p.supermarket_id}`}
                  className="col-span-2 text-xs text-muted hover:text-accent-700 hover:underline sm:col-span-1"
                >
                  {p.supermarket_name} · {p.supermarket_city}
                </Link>

                <div className="flex items-center gap-2 sm:justify-end">
                  {move && <Sparkline previous={move.previous_price} latest={move.latest_price} />}
                  <span className="num text-base font-bold text-foreground">{p.price.toFixed(2)} €</span>
                </div>

                <div className="sm:text-right">
                  <ChangeBadge pct={move?.pct_change} />
                </div>

                <div className="flex items-center justify-end gap-2">
                  {p.image_url && (
                    <a
                      href={p.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted underline"
                    >
                      foto
                    </a>
                  )}
                  <AddToBasketButton productId={p.product_id} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {(prices ?? []).length === 0 && (
        <p className="mt-8 text-center text-sm text-muted">
          No hay precios reportados{ciudad ? ` en ${ciudad}` : ""} todavía.
        </p>
      )}
    </div>
  );
}
