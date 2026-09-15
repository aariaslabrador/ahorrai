import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MapView from "@/components/MapView";
import RatingStars from "@/components/RatingStars";
import ChangeBadge from "@/components/ChangeBadge";
import { averageChangeBySupermarket, getWeeklyPriceMoves } from "@/lib/priceHistory";

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
          <h1 className="text-2xl font-bold text-neutral-900">Supermercados</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {ciudad ? `Mostrando resultados en ${ciudad}` : "Todas las ciudades"}
          </p>
        </div>
        <Link
          href="/supermercados/nuevo"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          + Añadir supermercado
        </Link>
      </div>

      <form className="mt-4 flex flex-wrap gap-2">
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
          Filtrar
        </button>
      </form>

      <div className="mt-6">
        <MapView markers={markers} />
      </div>

      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(supermarkets ?? []).map((s) => {
          const rating = ratingsById.get(s.id);
          return (
            <li key={s.id}>
              <Link
                href={`/supermercados/${s.id}`}
                className="block rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                <p className="font-semibold text-neutral-900">{s.name}</p>
                {s.chain && <p className="text-xs uppercase tracking-wide text-neutral-400">{s.chain}</p>}
                <p className="mt-1 text-sm text-neutral-500">
                  {s.address}, {s.city}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <RatingStars score={rating?.avg_score ?? 0} />
                    <span className="text-xs text-neutral-400">
                      {rating ? `${rating.avg_score} (${rating.ratings_count})` : "Sin valoraciones"}
                    </span>
                  </div>
                  {indexBySupermarket.has(s.id) && <ChangeBadge pct={indexBySupermarket.get(s.id)} />}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {(supermarkets ?? []).length === 0 && (
        <p className="mt-8 text-center text-sm text-neutral-400">
          No hay supermercados{ciudad ? ` en ${ciudad}` : ""} todavía. ¡Sé el primero en añadir uno!
        </p>
      )}
    </div>
  );
}
