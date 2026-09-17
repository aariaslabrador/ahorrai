import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWeeklyPriceMoves } from "@/lib/priceHistory";
import { productSymbol } from "@/lib/ticker";
import ChangeBadge from "@/components/ChangeBadge";
import Sparkline from "@/components/Sparkline";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: cityRows }, { data: topPrices }, { count: supermarketCount }, moves] = await Promise.all([
    supabase.from("supermarkets").select("city"),
    supabase.from("latest_prices").select("*").order("price", { ascending: true }).limit(6),
    supabase.from("supermarkets").select("*", { count: "exact", head: true }),
    getWeeklyPriceMoves(supabase),
  ]);

  const cities = Array.from(new Set((cityRows ?? []).map((c) => c.city))).sort();

  const overallChange = moves.length
    ? moves.reduce((sum, m) => sum + m.pct_change, 0) / moves.length
    : null;
  const gainers = moves
    .filter((m) => m.pct_change > 0)
    .sort((a, b) => b.pct_change - a.pct_change)
    .slice(0, 4);
  const losers = moves
    .filter((m) => m.pct_change < 0)
    .sort((a, b) => a.pct_change - b.pct_change)
    .slice(0, 4);

  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-neutral-200 bg-gradient-to-b from-accent-50 to-white">
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-8 px-4 py-16 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
              Cada producto tiene su cotización. Compra cuando el precio te conviene.
            </h1>
            <p className="mt-4 max-w-2xl text-neutral-600">
              Seguimos el precio de cada producto en cada supermercado como si fuera un valor
              bursátil: sube, baja, y tú decides dónde y cuándo comprar. Todo alimentado por fotos
              de etiquetas que sube la propia comunidad.
            </p>

            <form action="/supermercados" className="mt-8 flex w-full max-w-md gap-2">
              <select
                name="ciudad"
                defaultValue=""
                className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Elige tu ciudad</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700"
              >
                Ver mercados
              </button>
            </form>

            <p className="mt-3 text-xs text-neutral-400">
              {supermarketCount ?? 0} supermercados registrados por la comunidad
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
              Índice ahorrAI
            </p>
            <p className="mt-1 font-mono text-3xl font-bold text-neutral-900">
              {overallChange === null ? "—" : `${overallChange >= 0 ? "+" : ""}${overallChange.toFixed(1)}%`}
            </p>
            <div className="mt-2">
              <ChangeBadge pct={overallChange} />
            </div>
            <p className="mt-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
              Variación media de precios reportados esta semana, en toda la comunidad.
              {moves.length === 0 && " Aún no hay suficientes reportes repetidos para calcularla."}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/supermercados"
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-accent-300 hover:shadow-md"
          >
            <p className="text-2xl">📍</p>
            <p className="mt-2 font-semibold text-neutral-900">Localiza mercados</p>
            <p className="mt-1 text-sm text-neutral-500">
              Mapa interactivo y listado filtrable por ciudad.
            </p>
          </Link>
          <Link
            href="/ofertas"
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-accent-300 hover:shadow-md"
          >
            <p className="text-2xl">📈</p>
            <p className="mt-2 font-semibold text-neutral-900">Cotizaciones</p>
            <p className="mt-1 text-sm text-neutral-500">
              El último precio reportado de cada producto y su variación.
            </p>
          </Link>
          <Link
            href="/precios/nuevo"
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-accent-300 hover:shadow-md"
          >
            <p className="text-2xl">📷</p>
            <p className="mt-2 font-semibold text-neutral-900">Reporta un precio</p>
            <p className="mt-1 text-sm text-neutral-500">
              Haz una foto de la etiqueta: leemos el precio automáticamente.
            </p>
          </Link>
        </div>

        {(gainers.length > 0 || losers.length > 0) && (
          <div className="mt-12">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg font-bold text-neutral-900">Mayores movimientos de la semana</h2>
              <Link href="/ofertas" className="text-sm font-medium text-accent-700 hover:underline">
                Ver todas las cotizaciones
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-neutral-200 bg-white">
                <p className="border-b border-neutral-100 px-4 py-3 text-sm font-bold text-neutral-800">
                  📈 Suben más
                </p>
                <MoversList items={gainers} />
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white">
                <p className="border-b border-neutral-100 px-4 py-3 text-sm font-bold text-neutral-800">
                  📉 Bajan más
                </p>
                <MoversList items={losers} />
              </div>
            </div>
          </div>
        )}

        {topPrices && topPrices.length > 0 && (
          <div className="mt-12">
            <h2 className="font-display text-lg font-bold text-neutral-900">Cotizaciones destacadas</h2>
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topPrices.map((p) => (
                <li key={p.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                  <p className="font-medium text-neutral-800">{p.product_name}</p>
                  <p className="text-xs text-neutral-400">
                    {p.supermarket_name} · {p.supermarket_city}
                  </p>
                  <p className="mt-2 text-lg font-bold text-accent-700">{p.price.toFixed(2)} €</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function MoversList({
  items,
}: {
  items: Awaited<ReturnType<typeof getWeeklyPriceMoves>>;
}) {
  return (
    <ul className="divide-y divide-neutral-100">
      {items.map((m) => (
        <li key={`${m.product_id}::${m.supermarket_id}`} className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-mono text-[11px] font-bold text-accent-700">{productSymbol(m.product_name)}</p>
            <p className="text-sm font-medium text-neutral-800">{m.product_name}</p>
            <Link
              href={`/supermercados/${m.supermarket_id}`}
              className="text-xs text-neutral-400 hover:text-accent-700 hover:underline"
            >
              {m.supermarket_name}, {m.supermarket_city}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Sparkline previous={m.previous_price} latest={m.latest_price} />
            <div className="flex flex-col items-end gap-1">
              <span className="font-mono text-sm text-neutral-800">{m.latest_price.toFixed(2)} €</span>
              <ChangeBadge pct={m.pct_change} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
