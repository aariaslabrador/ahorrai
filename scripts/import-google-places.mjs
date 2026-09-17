#!/usr/bin/env node
/**
 * Importa supermercados desde la API oficial de Google Places para una
 * ciudad, y los da de alta en tu tabla `supermarkets`.
 *
 * A diferencia del importador de Mercadona, esto usa la API tal y como
 * Google la ofrece (con tu propia clave), así que no hay ningún problema
 * de términos de uso ni de bloqueo anti-bot: es el uso previsto.
 *
 * Requiere:
 *   - Un proyecto de Google Cloud con facturación activada y la
 *     "Places API" habilitada (console.cloud.google.com).
 *   - Una API key (restríngela a "Places API" en las credenciales).
 *
 * Uso:
 *   node scripts/import-google-places.mjs --city "Madrid" [opciones]
 *
 * Opciones:
 *   --city <nombre>     Obligatorio. Ciudad a buscar, ej. "Madrid".
 *   --query <texto>     Opcional. Qué buscar (por defecto: "supermercado").
 *   --limit <n>         Opcional. Máximo de resultados a importar (por defecto: 60, el máximo que da la API en una búsqueda de texto).
 *   --dry-run           No escribe nada en Supabase: solo muestra lo que encontraría.
 *
 * Variables de entorno requeridas (en .env.local o exportadas en tu shell):
 *   GOOGLE_MAPS_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (la "service_role"/"secret" key de Supabase,
 *                                 NUNCA la anon/publishable, y NUNCA en
 *                                 NEXT_PUBLIC_*. Solo se usa aquí, en un
 *                                 script que corres tú a mano.)
 *
 * Nota: Google Maps Platform tiene sus propias condiciones sobre cómo se
 * pueden guardar y mostrar los datos de Places (por ejemplo, algunos campos
 * están pensados para no cachearse más allá de cierto tiempo). Este script
 * guarda solo nombre, dirección y coordenadas para tu propio catálogo de
 * supermercados — revisa las condiciones actuales de Google Maps Platform
 * si vas a usarlo en un producto real con más usuarios.
 */

import { createClient } from "@supabase/supabase-js";

const TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json";
const PAGE_TOKEN_DELAY_MS = 2000; // Google exige un pequeño margen antes de que el next_page_token esté activo.

function parseArgs(argv) {
  const args = { limit: 60, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--city") args.city = argv[++i];
    else if (a === "--query") args.query = argv[++i];
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url) {
  const res = await fetch(url);
  const body = await res.json();
  if (body.status !== "OK" && body.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places respondió ${body.status}: ${body.error_message ?? "sin detalle"}`);
  }
  return body;
}

async function searchSupermarkets(apiKey, query, limit) {
  const results = [];
  let url = `${TEXT_SEARCH_URL}?query=${encodeURIComponent(query)}&key=${apiKey}`;

  while (url && results.length < limit) {
    const body = await fetchPage(url);
    results.push(...body.results);

    if (body.next_page_token && results.length < limit) {
      await sleep(PAGE_TOKEN_DELAY_MS);
      url = `${TEXT_SEARCH_URL}?pagetoken=${body.next_page_token}&key=${apiKey}`;
    } else {
      url = null;
    }
  }

  return results.slice(0, limit);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.city) {
    console.log('Uso: node scripts/import-google-places.mjs --city "Madrid" [--query "supermercado"] [--limit 60] [--dry-run]');
    process.exit(args.help ? 0 : 1);
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("Falta GOOGLE_MAPS_API_KEY en el entorno.");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!args.dryRun && (!supabaseUrl || !serviceKey)) {
    console.error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.\n" +
        "(Puedes usar --dry-run para probar solo la parte de Google Places, sin Supabase.)"
    );
    process.exit(1);
  }

  const supabase = !args.dryRun ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) : null;

  const query = `${args.query ?? "supermercado"} en ${args.city}`;
  console.log(`Buscando "${query}" en Google Places...`);

  const places = await searchSupermarkets(apiKey, query, args.limit);
  console.log(`${places.length} resultados encontrados.`);

  if (args.dryRun) {
    places.forEach((p) => console.log(`  - ${p.name} — ${p.formatted_address}`));
    return;
  }

  let created = 0;
  let skipped = 0;
  const errors = [];

  for (const p of places) {
    const name = p.name?.trim();
    const address = p.formatted_address?.trim();
    const lat = p.geometry?.location?.lat;
    const lng = p.geometry?.location?.lng;

    if (!name || !address || typeof lat !== "number" || typeof lng !== "number") {
      errors.push(`Resultado incompleto, se omite: ${JSON.stringify(p).slice(0, 120)}`);
      continue;
    }

    const { data: existing } = await supabase
      .from("supermarkets")
      .select("id")
      .eq("name", name)
      .eq("address", address)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    const { error } = await supabase.from("supermarkets").insert({
      name,
      address,
      city: args.city,
      lat,
      lng,
    });

    if (error) {
      errors.push(`"${name}": ${error.message}`);
      continue;
    }
    created++;
    console.log(`  + ${name} (${address})`);
  }

  console.log("\n— Resumen —");
  console.log(`Creados: ${created}`);
  console.log(`Ya existían (omitidos): ${skipped}`);
  if (errors.length) {
    console.log(`Errores (${errors.length}):`);
    errors.forEach((e) => console.log("  · " + e));
  }
}

main().catch((err) => {
  console.error("Fallo inesperado:", err);
  process.exit(1);
});
