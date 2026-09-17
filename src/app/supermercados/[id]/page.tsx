import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MapView from "@/components/MapView";
import RatingStars from "@/components/RatingStars";
import RatingBreakdown from "@/components/RatingBreakdown";
import AddToBasketButton from "@/components/AddToBasketButton";
import PriceSourceBadge from "@/components/PriceSourceBadge";
import ChangeBadge from "@/components/ChangeBadge";
import { getWeeklyPriceMoves, movesByPairKey } from "@/lib/priceHistory";
import { productSymbol } from "@/lib/ticker";
import RatingForm from "./RatingForm";

export default async function SupermercadoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: supermarket } = await supabase
    .from("supermarkets")
    .select("*")
    .eq("id", id)
    .single();

  if (!supermarket) {
    notFound();
  }

  const [{ data: ratingSummary }, { data: ratings }, { data: prices }, moves] = await Promise.all([
    supabase.from("supermarket_ratings").select("*").eq("supermarket_id", id).maybeSingle(),
    supabase
      .from("ratings")
      .select("*")
      .eq("supermarket_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("latest_prices")
      .select("*")
      .eq("supermarket_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    getWeeklyPriceMoves(supabase, { supermarketId: id }),
  ]);

  const changeByPair = movesByPairKey(moves);
  const storeIndex = moves.length
    ? moves.reduce((sum, m) => sum + m.pct_change, 0) / moves.length
    : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <Link href="/supermercados" className="text-sm text-muted hover:text-accent-700">
        ← Volver a supermercados
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{supermarket.name}</h1>
          {supermarket.chain && (
            <p className="text-xs uppercase tracking-wide text-muted">{supermarket.chain}</p>
          )}
          <p className="mt-1 text-sm text-muted">
            {supermarket.address}, {supermarket.city}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <RatingStars score={ratingSummary?.avg_score ?? 0} size="md" />
              <span className="text-sm text-muted">
                {ratingSummary
                  ? `${ratingSummary.avg_score} de 5 (${ratingSummary.ratings_count} valoraciones)`
                  : "Sin valoraciones todavía"}
              </span>
            </div>
            {storeIndex !== null && (
              <div className="flex items-center gap-1 text-xs text-muted">
                <span>Índice semanal:</span>
                <ChangeBadge pct={storeIndex} />
              </div>
            )}
          </div>
        </div>
        <Link
          href={`/precios/nuevo?supermarket=${supermarket.id}`}
          className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700"
        >
          📷 Reportar precio aquí
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <MapView
            markers={[{ id: supermarket.id, lat: supermarket.lat, lng: supermarket.lng, label: supermarket.name }]}
            center={[supermarket.lat, supermarket.lng]}
            zoom={16}
          />
          <RatingBreakdown summary={ratingSummary} />
        </div>
        <RatingForm supermarketId={supermarket.id} />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-foreground">Precios reportados recientemente</h2>
        {prices && prices.length > 0 ? (
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
            {prices.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-accent-700">
                      {productSymbol(p.product_name)}
                    </span>
                    <p className="font-medium text-foreground">{p.product_name}</p>
                    <PriceSourceBadge source={p.source} />
                  </div>
                  {p.product_brand && <p className="text-xs text-muted">{p.product_brand}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <ChangeBadge pct={changeByPair.get(`${p.product_id}::${p.supermarket_id}`)} />
                  <span className="font-semibold text-accent-700">{p.price.toFixed(2)} €</span>
                  {p.image_url && (
                    <a
                      href={p.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted underline"
                    >
                      ver foto
                    </a>
                  )}
                  <AddToBasketButton productId={p.product_id} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Todavía no hay precios reportados en este supermercado.
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-foreground">Valoraciones</h2>
        {ratings && ratings.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-3">
            {ratings.map((r) => (
              <li key={r.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-center justify-between">
                  <RatingStars score={r.score} />
                  <span className="text-xs text-muted">
                    {new Date(r.created_at).toLocaleDateString("es-ES")}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                  <span>Limpieza: {r.cleanliness}/5</span>
                  <span>Atención: {r.service}/5</span>
                  <span>Organización: {r.organization}/5</span>
                  <span>Precio: {r.price}/5</span>
                  {r.has_fish_counter !== null && (
                    <span>🐟 Pescadería: {r.has_fish_counter ? "sí" : "no"}</span>
                  )}
                  {r.has_butcher !== null && <span>🥩 Carnicería: {r.has_butcher ? "sí" : "no"}</span>}
                </div>
                {r.comment && <p className="mt-2 text-sm text-muted">{r.comment}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">Sé el primero en valorar este supermercado.</p>
        )}
      </section>
    </div>
  );
}
