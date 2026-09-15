"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ReportPriceState = { error: string | null };

export async function reportPrice(
  _prevState: ReportPriceState,
  formData: FormData
): Promise<ReportPriceState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Debes iniciar sesión para reportar un precio." };
  }

  const productName = String(formData.get("product_name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const supermarketId = String(formData.get("supermarket_id") ?? "");
  const price = Number(formData.get("price"));
  const imageUrl = String(formData.get("image_url") ?? "");
  const ocrRawText = String(formData.get("ocr_raw_text") ?? "") || null;
  const ocrConfidenceRaw = formData.get("ocr_confidence");
  const ocrConfidence = ocrConfidenceRaw ? Number(ocrConfidenceRaw) : null;

  if (!productName || !supermarketId) {
    return { error: "Indica el producto y el supermercado." };
  }
  if (!Number.isFinite(price) || price <= 0) {
    return { error: "El precio no es válido." };
  }
  if (!imageUrl) {
    return { error: "Falta la foto del precio." };
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .upsert({ name: productName, brand }, { onConflict: "name,brand" })
    .select("id")
    .single();

  if (productError || !product) {
    return { error: "No se pudo registrar el producto." };
  }

  const { error: priceError } = await supabase.from("price_reports").insert({
    product_id: product.id,
    supermarket_id: supermarketId,
    user_id: user.id,
    price,
    image_url: imageUrl,
    ocr_raw_text: ocrRawText,
    ocr_confidence: ocrConfidence,
  });

  if (priceError) {
    return { error: "No se pudo guardar el precio." };
  }

  redirect(`/supermercados/${supermarketId}`);
}
