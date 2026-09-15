import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: cityRows }, { data: topPrices }, { count: supermarketCount }] = await Promise.all([
    supabase.from("supermarkets").select("city"),
    supabase.from("latest_prices").select("*").order("price", { ascending: true }).limit(6),
    supabase.from("supermarkets").select("*", { count: "exact", head: true }),
  ]);

  const cities = Array.from(new Set((cityRows ?? []).map((c) => c.city))).sort();

  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-neutral-200 bg-gradient-to-b from-emerald-50 to-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center px-4 py-16 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
            Encuentra las mejores ofertas de los supermercados de tu ciudad
          </h1>
          <p className="mt-4 max-w-2xl text-neutral-600">
            Localiza supermercados cercanos, consulta sus valoraciones y descubre precios
            actualizados por la propia comunidad a partir de fotos de etiquetas.
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
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Ver supermercados
            </button>
          </form>

          <p className="mt-3 text-xs text-neutral-400">
            {supermarketCount ?? 0} supermercados registrados por la comunidad
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/supermercados"
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <p className="text-2xl">📍</p>
            <p className="mt-2 font-semibold text-neutral-900">Localiza supermercados</p>
            <p className="mt-1 text-sm text-neutral-500">
              Mapa interactivo y listado filtrable por ciudad.
            </p>
          </Link>
          <Link
            href="/ofertas"
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <p className="text-2xl">🏷️</p>
            <p className="mt-2 font-semibold text-neutral-900">Mejores ofertas</p>
            <p className="mt-1 text-sm text-neutral-500">
              Precios más bajos reportados recientemente por la comunidad.
            </p>
          </Link>
          <Link
            href="/precios/nuevo"
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <p className="text-2xl">📷</p>
            <p className="mt-2 font-semibold text-neutral-900">Reporta un precio</p>
            <p className="mt-1 text-sm text-neutral-500">
              Haz una foto de la etiqueta: leemos el precio automáticamente.
            </p>
          </Link>
        </div>

        {topPrices && topPrices.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-bold text-neutral-900">Últimas ofertas destacadas</h2>
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topPrices.map((p) => (
                <li key={p.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                  <p className="font-medium text-neutral-800">{p.product_name}</p>
                  <p className="text-xs text-neutral-400">
                    {p.supermarket_name} · {p.supermarket_city}
                  </p>
                  <p className="mt-2 text-lg font-bold text-emerald-700">{p.price.toFixed(2)} €</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
