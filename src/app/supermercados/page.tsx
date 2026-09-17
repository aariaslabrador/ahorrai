import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MapView from "@/components/MapView";
import RatingStars from "@/components/RatingStars";
import ChangeBadge from "@/components/ChangeBadge";
import Sparkline from "@/components/Sparkline";
import { averageChangeBySupermarket, averagePricesBySupermarket, getWeeklyPriceMoves } from "@/lib/priceHistory";

export default async function SupermercadosPage({
  searchParams,
}: {
  searchParams: Promise<{ ciudad?: string }>;
}) {
  const { ciudad } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("supermarkets").select("*").order("name");
  if (ciudad) {
    query = query.ilike("city", ciudad);
  }
  const { data: supermarkets } = await query;

  const { data: ratingRows } = await supabase.from("supermarket_ratings").select("*");
  const ratingsById = new Map((ratingRows ?? []).map((r) => [r.supermarket_id, r]));

  const moves = await getWeeklyPriceMoves(supabase);
  const indexBySupermarket = averageChangeBySupermarket(moves);
  const pricesBySupermarket = averagePricesBySupermarket(moves);

  const { data: cityRows } = await supabase
    .from("supermarkets")
    .select("city")
    .order("city");
  const cities = Array.from(new Set((cityRows ?? []).map((c) => c.city)));

  const markers = (supermarkets ?? []).map((s) => ({
    id: s.id,
    lat: s.lat,
    lng: s.lng,
    label: s.name,
    href: `/supermercados/${s.id}`,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Supermercados</h1>
          <p className="mt-1 text-sm text-muted">
            {ciudad ? `Mostrando resultados en ${ciudad}` : "Todas las ciudades"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/supermercados/importar"
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted hover:bg-surface-2"
          >
            Importar desde Google Maps
          </Link>
          <Link
            href="/supermercados/nuevo"
            className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700"
          >
            + Añadir supermercado
          </Link>
        </div>
      </div>

      <form className="mt-4 flex flex-wrap gap-2">
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
          Filtrar
        </button>
      </form>

      <div className="mt-6">
        <MapView markers={markers} />
      </div>

      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(supermarkets ?? []).map((s) => {
          const rating = ratingsById.get(s.id);
          const change = indexBySupermarket.get(s.id);
          const prices = pricesBySupermarket.get(s.id);
          return (
            <li key={s.id}>
              <Link
                href={`/supermercados/${s.id}`}
                className="block rounded-xl border border-line bg-surface p-4 shadow-sm transition hover:border-accent-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {s.chain && (
                      <p className="text-[11px] font-bold uppercase tracking-wide text-accent-600">
                        {s.chain}
                      </p>
                    )}
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {s.address}, {s.city}
                    </p>
                  </div>
                  {change !== undefined && (
                    <div className="shrink-0 text-right">
                      <p className="num text-base font-bold text-foreground">
                        {change >= 0 ? "+" : ""}
                        {change.toFixed(1)}%
                      </p>
                      <ChangeBadge pct={change} />
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
                  <div className="flex items-center gap-2">
                    <RatingStars score={rating?.avg_score ?? 0} />
                    <span className="text-xs text-muted">
                      {rating ? `${rating.avg_score} (${rating.ratings_count})` : "Sin valoraciones"}
                    </span>
                  </div>
                  {prices && <Sparkline previous={prices.previous} latest={prices.latest} />}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {(supermarkets ?? []).length === 0 && (
        <p className="mt-8 text-center text-sm text-muted">
          No hay supermercados{ciudad ? ` en ${ciudad}` : ""} todavía. ¡Sé el primero en añadir uno!
        </p>
      )}
    </div>
  );
}
