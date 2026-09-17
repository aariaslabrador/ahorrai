#!/usr/bin/env node
/**
 * Inserta en Supabase una lista de productos/precios YA EXTRAÍDA de un
 * folleto — sin llamar a ninguna API de pago. Pensado para probar el flujo
 * gratis: le pides a Claude (aquí mismo en el chat, o en claude.ai) que lea
 * una foto del folleto y te devuelva el JSON con este formato exacto:
 *
 *   { "products": [
 *       { "name": "Aceite de oliva virgen extra", "brand": "", "price": 6.49, "unit": "1 L" },
 *       { "name": "Leche entera", "brand": "Milbona", "price": 0.89, "unit": "1 L" }
 *   ]}
 *
 * Guarda esa respuesta en un archivo .json y pásaselo a este script.
 *
 * Uso:
 *   node scripts/import-flyer-json.mjs --supermarket <uuid> --json folleto.json [--image folleto-pag1.jpg] [--dry-run]
 *
 * Opciones:
 *   --supermarket <uuid>   Obligatorio (salvo --dry-run sin Supabase).
 *   --json <ruta>           Obligatorio. Archivo con el JSON de productos (ver formato arriba).
 *   --image <ruta>          Opcional. Si la pasas, se sube como evidencia (misma foto que analizaste).
 *   --dry-run               No escribe nada en Supabase: solo valida y muestra el JSON.
 *
 * Variables de entorno requeridas (salvo --dry-run):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (NUNCA la anon key)
 *
 * No necesita ANTHROPIC_API_KEY: la extracción ya la hiciste tú (gratis,
 * pegando la foto en un chat de Claude) antes de llamar a este script.
 */

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { uploadFlyerImage, insertFlyerProducts } from "./lib/flyerInsert.mjs";

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--supermarket") args.supermarket = argv[++i];
    else if (a === "--json") args.json = argv[++i];
    else if (a === "--image") args.image = argv[++i];
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.json || (!args.dryRun && !args.supermarket)) {
    console.log(
      "Uso: node scripts/import-flyer-json.mjs --supermarket <uuid> --json <archivo.json> [--image <foto>] [--dry-run]"
    );
    process.exit(args.help ? 0 : 1);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(args.json, "utf8"));
  } catch (err) {
    console.error(`No pude leer/parsear ${args.json}: ${err.message}`);
    process.exit(1);
  }
  const products = Array.isArray(parsed) ? parsed : parsed.products;
  if (!Array.isArray(products)) {
    console.error('El JSON debe ser {"products": [...]} o directamente un array de productos.');
    process.exit(1);
  }
  console.log(`${products.length} productos leídos de ${args.json}.`);

  if (args.dryRun) {
    for (const p of products) {
      console.log(
        `  - ${p.name}${p.brand ? ` (${p.brand})` : ""}: ${Number(p.price).toFixed(2)} €${p.unit ? ` / ${p.unit}` : ""}`
      );
    }
    console.log("\n(--dry-run: no se ha escrito nada en Supabase.)");
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: sm, error } = await supabase
    .from("supermarkets")
    .select("id, name, city")
    .eq("id", args.supermarket)
    .maybeSingle();
  if (error || !sm) {
    console.error(`No encuentro el supermercado ${args.supermarket} en tu base de datos.`);
    process.exit(1);
  }
  console.log(`Importando folleto para: ${sm.name} (${sm.city})`);

  const errors = [];
  const imageUrl = args.image ? await uploadFlyerImage(supabase, args.supermarket, args.image, errors) : null;
  const inserted = await insertFlyerProducts(supabase, args.supermarket, products, imageUrl, errors);

  console.log("\n— Resumen —");
  console.log(`Precios insertados: ${inserted} de ${products.length}`);
  if (errors.length) {
    console.log(`Errores (${errors.length}):`);
    errors.forEach((e) => console.log("  · " + e));
  }
}

main().catch((err) => {
  console.error("Fallo inesperado:", err);
  process.exit(1);
});
