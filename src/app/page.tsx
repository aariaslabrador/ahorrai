import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { averageChangeBySupermarket, getWeeklyPriceMoves } from "@/lib/priceHistory";
import { productSymbol } from "@/lib/ticker";
import ChangeBadge from "@/components/ChangeBadge";
import Sparkline from "@/components/Sparkline";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: supermarketRows }, { data: topPrices }, { count: supermarketCount }, moves] = await Promise.all([
    supabase.from("supermarkets").select("id, name, city"),
    supabase.from("latest_prices").select("*").order("price", { ascending: true }).limit(6),
    supabase.from("supermarkets").select("*", { count: "exact", head: true }),
    getWeeklyPriceMoves(supabase),
  ]);

  const cities = Array.from(new Set((supermarketRows ?? []).map((c) => c.city))).sort();
  const changeBySupermarket = averageChangeBySupermarket(moves);
  const leaderboard = (supermarketRows ?? [])
    .filter((s) => changeBySupermarket.has(s.id))
    .map((s) => ({ ...s, change: changeBySupermarket.get(s.id)! }))
    .sort((a, b) => a.change - b.change)
    .slice(0, 5);

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
      <section className="border-b border-line bg-gradient-to-b from-accent-50 to-background">
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-8 px-4 py-16 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Cada producto tiene su cotización. Compra cuando el precio te conviene.
            </h1>
            <p className="mt-4 max-w-2xl text-muted">
              Seguimos el precio de cada producto en cada supermercado como si fuera un valor
              bursátil: sube, baja, y tú decides dónde y cuándo comprar. Todo alimentado por fotos
              de etiquetas que sube la propia comunidad.
            </p>

            <form action="/supermercados" className="mt-8 flex w-full max-w-md gap-2">
              <select
                name="ciudad"
                defaultValue=""
                className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
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

            <p className="mt-3 text-xs text-muted">
              {supermarketCount ?? 0} supermercados registrados por la comunidad
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">
                  Índice ahorrAI
                </p>
                <p className="num mt-1 text-4xl font-bold text-foreground">
                  {overallChange === null ? "—" : `${overallChange >= 0 ? "+" : ""}${overallChange.toFixed(1)}%`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-price-down shadow-[0_0_0_3px_var(--price-down-soft)]" />
                Mercado abierto
              </div>
            </div>
            <ChangeBadge pct={overallChange} />
            <p className="border-t border-line pt-3 text-xs text-muted">
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
            className="rounded-xl border border-line bg-surface p-5 shadow-sm transition hover:border-accent-300 hover:shadow-md"
          >
            <p className="text-2xl">📍</p>
            <p className="mt-2 font-semibold text-foreground">Localiza mercados</p>
            <p className="mt-1 text-sm text-muted">
              Mapa interactivo y listado filtrable por ciudad.
            </p>
          </Link>
          <Link
            href="/ofertas"
            className="rounded-xl border border-line bg-surface p-5 shadow-sm transition hover:border-accent-300 hover:shadow-md"
          >
            <p className="text-2xl">📈</p>
            <p className="mt-2 font-semibold text-foreground">Cotizaciones</p>
            <p className="mt-1 text-sm text-muted">
              El último precio reportado de cada producto y su variación.
            </p>
          </Link>
          <Link
            href="/precios/nuevo"
            className="rounded-xl border border-line bg-surface p-5 shadow-sm transition hover:border-accent-300 hover:shadow-md"
          >
            <p className="text-2xl">📷</p>
            <p className="mt-2 font-semibold text-foreground">Reporta un precio</p>
            <p className="mt-1 text-sm text-muted">
              Haz una foto de la etiqueta: leemos el precio automáticamente.
            </p>
          </Link>
        </div>

        {(gainers.length > 0 || losers.length > 0) && (
          <div className="mt-12">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">Mayores movimientos de la semana</h2>
              <Link href="/ofertas" className="text-sm font-medium text-accent-700 hover:underline">
                Ver todas las cotizaciones
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-line bg-surface">
                <p className="border-b border-line px-4 py-3 text-sm font-bold text-foreground">
                  📈 Suben más
                </p>
                <MoversList items={gainers} />
              </div>
              <div className="rounded-xl border border-line bg-surface">
                <p className="border-b border-line px-4 py-3 text-sm font-bold text-foreground">
                  📉 Bajan más
                </p>
                <MoversList items={losers} />
              </div>
            </div>
          </div>
        )}

        {leaderboard.length > 0 && (
          <div className="mt-12">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">Mercados más baratos hoy</h2>
              <Link href="/supermercados" className="text-sm font-medium text-accent-700 hover:underline">
                Ver todos los mercados
              </Link>
            </div>
            <div className="mt-3 flex flex-col rounded-xl border border-line bg-surface">
              {leaderboard.map((s, i) => (
                <Link
                  key={s.id}
                  href={`/supermercados/${s.id}`}
                  className="grid grid-cols-[22px_1fr_auto_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-surface-2"
                >
                  <span className="num text-xs text-muted">{i + 1}</span>
                  <div>
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted">{s.city}</p>
                  </div>
                  <span className="num text-sm text-foreground">
                    {s.change >= 0 ? "+" : ""}
                    {s.change.toFixed(1)}%
                  </span>
                  <ChangeBadge pct={s.change} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {topPrices && topPrices.length > 0 && (
          <div className="mt-12">
            <h2 className="font-display text-lg font-bold text-foreground">Cotizaciones destacadas</h2>
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topPrices.map((p) => (
                <li key={p.id} className="rounded-xl border border-line bg-surface p-4">
                  <p className="font-medium text-foreground">{p.product_name}</p>
                  <p className="text-xs text-muted">
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
    <ul className="divide-y divide-line">
      {items.map((m) => (
        <li key={`${m.product_id}::${m.supermarket_id}`} className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-mono text-[11px] font-bold text-accent-700">{productSymbol(m.product_name)}</p>
            <p className="text-sm font-medium text-foreground">{m.product_name}</p>
            <Link
              href={`/supermercados/${m.supermarket_id}`}
              className="text-xs text-muted hover:text-accent-700 hover:underline"
            >
              {m.supermarket_name}, {m.supermarket_city}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Sparkline previous={m.previous_price} latest={m.latest_price} />
            <div className="flex flex-col items-end gap-1">
              <span className="font-mono text-sm text-foreground">{m.latest_price.toFixed(2)} €</span>
              <ChangeBadge pct={m.pct_change} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
