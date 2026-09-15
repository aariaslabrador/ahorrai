import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const WINDOW_DAYS = 7;
const MAX_REPORTS_SCANNED = 2000;

export type PriceMove = {
  product_id: string;
  supermarket_id: string;
  product_name: string;
  product_brand: string;
  supermarket_name: string;
  supermarket_city: string;
  latest_price: number;
  previous_price: number;
  pct_change: number;
};

/**
 * Variación real de precio (últimos 7 días) por cada pareja producto+supermercado
 * que tenga al menos dos reportes en la ventana. Sin datos suficientes, la pareja
 * simplemente no aparece — nunca se inventa una variación.
 */
export async function getWeeklyPriceMoves(
  supabase: SupabaseClient<Database>,
  options: { supermarketId?: string } = {}
): Promise<PriceMove[]> {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  let reportsQuery = supabase
    .from("price_reports")
    .select("product_id, supermarket_id, price, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(MAX_REPORTS_SCANNED);
  if (options.supermarketId) reportsQuery = reportsQuery.eq("supermarket_id", options.supermarketId);

  const { data: reports } = await reportsQuery;

  if (!reports || reports.length === 0) return [];

  // Los reportes vienen ordenados ascendente por fecha: el primero que vemos de
  // cada pareja producto+supermercado marca el precio "antiguo", y cada uno
  // siguiente actualiza el precio "reciente".
  const byPair = new Map<
    string,
    { product_id: string; supermarket_id: string; oldest: number; newest: number; count: number }
  >();
  for (const r of reports) {
    const key = `${r.product_id}::${r.supermarket_id}`;
    const existing = byPair.get(key);
    if (!existing) {
      byPair.set(key, { product_id: r.product_id, supermarket_id: r.supermarket_id, oldest: r.price, newest: r.price, count: 1 });
    } else {
      existing.newest = r.price;
      existing.count += 1;
    }
  }

  const validPairs = Array.from(byPair.values()).filter((p) => p.count >= 2);
  if (validPairs.length === 0) return [];

  const productIds = Array.from(new Set(validPairs.map((p) => p.product_id)));
  const supermarketIds = Array.from(new Set(validPairs.map((p) => p.supermarket_id)));

  const [{ data: products }, { data: supermarkets }] = await Promise.all([
    supabase.from("products").select("id, name, brand").in("id", productIds),
    supabase.from("supermarkets").select("id, name, city").in("id", supermarketIds),
  ]);
  const productMap = new Map((products ?? []).map((p) => [p.id, p]));
  const supermarketMap = new Map((supermarkets ?? []).map((s) => [s.id, s]));

  return validPairs
    .map((p) => {
      const product = productMap.get(p.product_id);
      const supermarket = supermarketMap.get(p.supermarket_id);
      return {
        product_id: p.product_id,
        supermarket_id: p.supermarket_id,
        product_name: product?.name ?? "Producto",
        product_brand: product?.brand ?? "",
        supermarket_name: supermarket?.name ?? "Supermercado",
        supermarket_city: supermarket?.city ?? "",
        latest_price: p.newest,
        previous_price: p.oldest,
        pct_change: ((p.newest - p.oldest) / p.oldest) * 100,
      };
    })
    .filter((m) => Number.isFinite(m.pct_change));
}

export function movesByPairKey(moves: PriceMove[]): Map<string, number> {
  return new Map(moves.map((m) => [`${m.product_id}::${m.supermarket_id}`, m.pct_change]));
}

/** Variación media semanal por supermercado, agregando todas sus parejas producto+precio. */
export function averageChangeBySupermarket(moves: PriceMove[]): Map<string, number> {
  const groups = new Map<string, number[]>();
  for (const m of moves) {
    if (!groups.has(m.supermarket_id)) groups.set(m.supermarket_id, []);
    groups.get(m.supermarket_id)!.push(m.pct_change);
  }
  const result = new Map<string, number>();
  groups.forEach((values, supermarketId) => {
    result.set(supermarketId, values.reduce((sum, v) => sum + v, 0) / values.length);
  });
  return result;
}
