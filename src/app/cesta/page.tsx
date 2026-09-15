import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BasketList, { type BasketListItem } from "./BasketList";
import AddProductForm from "./AddProductForm";
import ComparePanel from "./ComparePanel";

export default async function CestaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: basket } = await supabase
    .from("baskets")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let items: BasketListItem[] = [];

  if (basket) {
    const { data: basketItems } = await supabase
      .from("basket_items")
      .select("id, product_id, quantity")
      .eq("basket_id", basket.id)
      .order("created_at");

    if (basketItems && basketItems.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("id, name, brand")
        .in(
          "id",
          basketItems.map((i) => i.product_id)
        );
      const productsById = new Map((products ?? []).map((p) => [p.id, p]));

      items = basketItems.map((i) => ({
        itemId: i.id,
        productId: i.product_id,
        name: productsById.get(i.product_id)?.name ?? "Producto",
        brand: productsById.get(i.product_id)?.brand ?? "",
        quantity: i.quantity,
      }));
    }
  }

  const [{ data: supermarkets }, { data: allProducts }] = await Promise.all([
    supabase.from("supermarkets").select("id, name, city, lat, lng").order("name"),
    supabase.from("products").select("name, brand").order("name").limit(200),
  ]);

  const cities = Array.from(new Set((supermarkets ?? []).map((s) => s.city))).sort();
  const knownProducts = Array.from(
    new Set((allProducts ?? []).map((p) => [p.name, p.brand].filter(Boolean).join(" ")))
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-900">Mi cartera</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Añade los productos que sueles comprar y pide cotización a los supermercados cercanos para
        ver dónde te sale más barata esa misma cesta.
      </p>

      <div className="mt-6">
        <BasketList items={items} />
      </div>

      <div className="mt-4">
        <AddProductForm knownProducts={knownProducts} />
      </div>

      <div className="mt-8">
        <ComparePanel
          supermarkets={supermarkets ?? []}
          cities={cities}
          totalItems={items.length}
        />
      </div>
    </div>
  );
}
