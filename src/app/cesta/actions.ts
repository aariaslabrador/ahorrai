"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type BasketActionState = { error: string | null };

export type SupermarketBasketTotal = {
  supermarket_id: string;
  supermarket_name: string;
  supermarket_city: string;
  supermarket_lat: number;
  supermarket_lng: number;
  total: number;
  itemsFound: number;
  itemsMissing: number;
  missingProductNames: string[];
};

async function requireUser(supabase: SupabaseClient<Database>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function getOrCreateBasketId(supabase: SupabaseClient<Database>, userId: string) {
  const { data: existing } = await supabase
    .from("baskets")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("baskets")
    .insert({ user_id: userId })
    .select("id")
    .single();

  if (error || !created) throw new Error("No se pudo crear la cesta.");
  return created.id;
}

export async function addProductByName(
  _prevState: BasketActionState,
  formData: FormData
): Promise<BasketActionState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return { error: "Debes iniciar sesión para usar la cesta." };

  const name = String(formData.get("product_name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const quantity = Math.max(1, Number(formData.get("quantity")) || 1);

  if (!name) return { error: "Indica un producto." };

  const { data: product, error: productError } = await supabase
    .from("products")
    .upsert({ name, brand }, { onConflict: "name,brand" })
    .select("id")
    .single();

  if (productError || !product) return { error: "No se pudo registrar el producto." };

  const result = await addExistingProductToBasket(product.id, quantity);
  return result;
}

export async function addExistingProductToBasket(
  productId: string,
  quantity = 1
): Promise<BasketActionState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return { error: "Debes iniciar sesión para usar la cesta." };

  try {
    const basketId = await getOrCreateBasketId(supabase, user.id);

    const { data: existingItem } = await supabase
      .from("basket_items")
      .select("id, quantity")
      .eq("basket_id", basketId)
      .eq("product_id", productId)
      .maybeSingle();

    if (existingItem) {
      const { error } = await supabase
        .from("basket_items")
        .update({ quantity: existingItem.quantity + quantity })
        .eq("id", existingItem.id);
      if (error) return { error: "No se pudo actualizar la cesta." };
    } else {
      const { error } = await supabase
        .from("basket_items")
        .insert({ basket_id: basketId, product_id: productId, quantity });
      if (error) return { error: "No se pudo añadir el producto a la cesta." };
    }
  } catch {
    return { error: "No se pudo añadir el producto a la cesta." };
  }

  revalidatePath("/cesta");
  return { error: null };
}

export async function updateBasketItemQuantity(itemId: string, quantity: number) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return { error: "Debes iniciar sesión." };

  if (quantity <= 0) {
    return removeBasketItem(itemId);
  }

  const { error } = await supabase.from("basket_items").update({ quantity }).eq("id", itemId);
  if (error) return { error: "No se pudo actualizar la cantidad." };

  revalidatePath("/cesta");
  return { error: null };
}

export async function removeBasketItem(itemId: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return { error: "Debes iniciar sesión." };

  const { error } = await supabase.from("basket_items").delete().eq("id", itemId);
  if (error) return { error: "No se pudo quitar el producto." };

  revalidatePath("/cesta");
  return { error: null };
}

export async function compareBasketAcrossSupermarkets(
  supermarketIds: string[]
): Promise<SupermarketBasketTotal[]> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user || supermarketIds.length === 0) return [];

  const basketId = await getOrCreateBasketId(supabase, user.id);

  const [{ data: items }, { data: supermarkets }] = await Promise.all([
    supabase.from("basket_items").select("product_id, quantity").eq("basket_id", basketId),
    supabase.from("supermarkets").select("id, name, city, lat, lng").in("id", supermarketIds),
  ]);

  if (!items || items.length === 0 || !supermarkets) return [];

  const productIds = items.map((i) => i.product_id);

  const [{ data: products }, { data: prices }] = await Promise.all([
    supabase.from("products").select("id, name, brand").in("id", productIds),
    supabase
      .from("latest_prices")
      .select("*")
      .in("supermarket_id", supermarketIds)
      .in("product_id", productIds),
  ]);

  const productLabels = new Map(
    (products ?? []).map((p) => [p.id, [p.name, p.brand].filter(Boolean).join(" ")])
  );

  const pricesBySupermarket = new Map<string, Map<string, number>>();
  for (const p of prices ?? []) {
    if (!pricesBySupermarket.has(p.supermarket_id)) {
      pricesBySupermarket.set(p.supermarket_id, new Map());
    }
    pricesBySupermarket.get(p.supermarket_id)!.set(p.product_id, p.price);
  }

  const results: SupermarketBasketTotal[] = supermarkets.map((s) => {
    const productPrices = pricesBySupermarket.get(s.id) ?? new Map<string, number>();
    let total = 0;
    let itemsFound = 0;
    const missingProductNames: string[] = [];

    for (const item of items) {
      const price = productPrices.get(item.product_id);
      const productLabel = productLabels.get(item.product_id) ?? "Producto";

      if (price !== undefined) {
        total += price * item.quantity;
        itemsFound += 1;
      } else {
        missingProductNames.push(productLabel);
      }
    }

    return {
      supermarket_id: s.id,
      supermarket_name: s.name,
      supermarket_city: s.city,
      supermarket_lat: s.lat,
      supermarket_lng: s.lng,
      total,
      itemsFound,
      itemsMissing: missingProductNames.length,
      missingProductNames,
    };
  });

  return results.sort((a, b) => {
    if (a.itemsFound !== b.itemsFound) return b.itemsFound - a.itemsFound;
    return a.total - b.total;
  });
}
