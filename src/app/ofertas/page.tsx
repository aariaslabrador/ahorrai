import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AddToBasketButton from "@/components/AddToBasketButton";
import PriceSourceBadge from "@/components/PriceSourceBadge";
import ChangeBadge from "@/components/ChangeBadge";
import { getWeeklyPriceMoves, movesByPairKey } from "@/lib/priceHistory";
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
  const changeByPair = movesByPairKey(moves);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-900">Cotizaciones</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Último precio reportado de cada producto y su variación en los últimos 7 días.
      </p>

      <form className="mt-4 flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar producto..."
          className="flex-1 min-w-[180px] rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <select
          name="ciudad"
          defaultValue={ciudad ?? ""}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
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
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100"
        >
          Buscar
        </button>
      </form>

      <ul className="mt-6 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {(prices ?? []).map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-emerald-700">
                  {productSymbol(p.product_name)}
                </span>
                <p className="font-medium text-neutral-800">{p.product_name}</p>
                <PriceSourceBadge source={p.source} />
              </div>
              {p.product_brand && <p className="text-xs text-neutral-400">{p.product_brand}</p>}
              <Link
                href={`/supermercados/${p.supermarket_id}`}
                className="text-xs text-emerald-700 hover:underline"
              >
                {p.supermarket_name} · {p.supermarket_city}
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <ChangeBadge pct={changeByPair.get(`${p.product_id}::${p.supermarket_id}`)} />
              <span className="text-lg font-bold text-emerald-700">{p.price.toFixed(2)} €</span>
              {p.image_url && (
                <a
                  href={p.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-neutral-400 underline"
                >
                  ver foto
                </a>
              )}
              <AddToBasketButton productId={p.product_id} />
            </div>
          </li>
        ))}
      </ul>

      {(prices ?? []).length === 0 && (
        <p className="mt-8 text-center text-sm text-neutral-400">
          No hay precios reportados{ciudad ? ` en ${ciudad}` : ""} todavía.
        </p>
      )}
    </div>
  );
}
