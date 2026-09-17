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
 *     "Places API (New)" habilitada (console.cloud.google.com). Ojo: es
 *     distinta de la "Places API" clásica/legacy — esa ya no se activa
 *     en proyectos nuevos.
 *   - Una API key (restríngela a "Places API (New)" en las credenciales).
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

// Google retiró la Places API "clásica" para proyectos nuevos: esto usa
// Places API (New), que habla JSON por POST en vez de query params por GET.
const TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = "places.displayName,places.formattedAddress,places.location,nextPageToken";
const PAGE_TOKEN_DELAY_MS = 2000; // Igual que la API clásica, conviene esperar antes de pedir la siguiente página.

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

async function fetchPage(apiKey, textQuery, pageToken) {
  const res = await fetch(TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "es",
      ...(pageToken ? { pageToken } : {}),
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Google Places (New) respondió: ${body?.error?.message ?? `HTTP ${res.status}`}`);
  }
  return body; // { places: [...], nextPageToken? }
}

async function searchSupermarkets(apiKey, query, limit) {
  const results = [];
  let pageToken;

  do {
    const body = await fetchPage(apiKey, query, pageToken);
    results.push(...(body.places ?? []));
    pageToken = results.length < limit ? body.nextPageToken : undefined;
    if (pageToken) await sleep(PAGE_TOKEN_DELAY_MS);
  } while (pageToken && results.length < limit);

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
    places.forEach((p) => console.log(`  - ${p.displayName?.text} — ${p.formattedAddress}`));
    return;
  }

  let created = 0;
  let skipped = 0;
  const errors = [];

  for (const p of places) {
    const name = p.displayName?.text?.trim();
    const address = p.formattedAddress?.trim();
    const lat = p.location?.latitude;
    const lng = p.location?.longitude;

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
