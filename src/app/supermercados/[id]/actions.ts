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
  const score = Number(formData.get("score"));
  const comment = String(formData.get("comment") ?? "").trim();

  if (!supermarketId || score < 1 || score > 5) {
    return { error: "Selecciona una puntuación entre 1 y 5." };
  }

  const { error } = await supabase.from("ratings").upsert(
    {
      supermarket_id: supermarketId,
      user_id: user.id,
      score,
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
