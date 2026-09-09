"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CreateSupermarketState = { error: string | null };

export async function createSupermarket(
  _prevState: CreateSupermarketState,
  formData: FormData
): Promise<CreateSupermarketState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Debes iniciar sesión para añadir un supermercado." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const chain = String(formData.get("chain") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));

  if (!name || !address || !city) {
    return { error: "Nombre, dirección y ciudad son obligatorios." };
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: "Selecciona la ubicación en el mapa." };
  }

  const { data, error } = await supabase
    .from("supermarkets")
    .insert({
      name,
      chain: chain || null,
      address,
      city,
      lat,
      lng,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "No se pudo guardar el supermercado. Inténtalo de nuevo." };
  }

  redirect(`/supermercados/${data.id}`);
}
