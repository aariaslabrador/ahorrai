// Lógica compartida por import-flyer.mjs (extracción con la API de Claude)
// e import-flyer-json.mjs (extracción ya hecha a mano/gratis, solo inserta).
// No depende de @anthropic-ai/sdk: nada aquí llama a ninguna API de pago.

import fs from "node:fs";
import path from "node:path";

export function mediaTypeFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  throw new Error(`Formato no soportado: ${file} (usa jpg/png/webp)`);
}

/** Sube la foto del folleto a Storage y devuelve su URL pública, o null si falla. */
export async function uploadFlyerImage(supabase, supermarketId, file, errors) {
  try {
    const bytes = fs.readFileSync(file);
    const storagePath = `flyers/${supermarketId}/${Date.now()}-${path.basename(file)}`;
    const { error: uploadError } = await supabase.storage
      .from("price-photos")
      .upload(storagePath, bytes, { contentType: mediaTypeFor(file) });
    if (uploadError) throw uploadError;
    return supabase.storage.from("price-photos").getPublicUrl(storagePath).data.publicUrl;
  } catch (err) {
    errors.push(`Subida de imagen ${file}: ${err.message}`);
    return null;
  }
}

/**
 * Inserta una lista de productos ya extraídos ({name, brand, price, unit?})
 * como price_reports con source='flyer' para un supermercado. Devuelve
 * cuántos se insertaron y acumula errores en `errors`.
 */
export async function insertFlyerProducts(supabase, supermarketId, products, imageUrl, errors) {
  let inserted = 0;
  for (const p of products) {
    if (!p?.name || !Number.isFinite(p.price) || p.price <= 0) continue;

    const { data: product, error: productError } = await supabase
      .from("products")
      .upsert({ name: String(p.name).trim(), brand: String(p.brand ?? "").trim() }, { onConflict: "name,brand" })
      .select("id")
      .single();
    if (productError || !product) {
      errors.push(`Producto "${p.name}": ${productError?.message ?? "error desconocido"}`);
      continue;
    }

    const { error: priceError } = await supabase.from("price_reports").insert({
      product_id: product.id,
      supermarket_id: supermarketId,
      price: p.price,
      source: "flyer",
      image_url: imageUrl,
    });
    if (priceError) {
      errors.push(`Precio "${p.name}": ${priceError.message}`);
      continue;
    }
    inserted++;
  }
  return inserted;
}
