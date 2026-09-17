"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RateState = { error: string | null; success?: boolean };

export async function rateSupermarket(
  _prevState: RateState,
  formData: FormData
): Promise<RateState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Debes iniciar sesión para valorar." };
  }

  const supermarketId = String(formData.get("supermarket_id") ?? "");
  const cleanliness = Number(formData.get("cleanliness"));
  const service = Number(formData.get("service"));
  const organization = Number(formData.get("organization"));
  const price = Number(formData.get("price"));
  const fishCounterRaw = String(formData.get("has_fish_counter") ?? "");
  const butcherRaw = String(formData.get("has_butcher") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();

  const criteria = [cleanliness, service, organization, price];
  if (!supermarketId || criteria.some((c) => !Number.isInteger(c) || c < 1 || c > 5)) {
    return { error: "Puntúa los 4 criterios (limpieza, atención, organización y precio) entre 1 y 5." };
  }
  if (fishCounterRaw !== "true" && fishCounterRaw !== "false") {
    return { error: "Indica si tiene pescadería." };
  }
  if (butcherRaw !== "true" && butcherRaw !== "false") {
    return { error: "Indica si tiene carnicería." };
  }

  const score = Math.round(criteria.reduce((sum, c) => sum + c, 0) / criteria.length);

  const { error } = await supabase.from("ratings").upsert(
    {
      supermarket_id: supermarketId,
      user_id: user.id,
      score,
      cleanliness,
      service,
      organization,
      price,
      has_fish_counter: fishCounterRaw === "true",
      has_butcher: butcherRaw === "true",
      comment: comment || null,
    },
    { onConflict: "supermarket_id,user_id" }
  );

  if (error) {
    return { error: "No se pudo guardar la valoración." };
  }

  revalidatePath(`/supermercados/${supermarketId}`);
  return { error: null, success: true };
}
