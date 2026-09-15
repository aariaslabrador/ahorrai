#!/usr/bin/env node
/**
 * Importa el catálogo público de tienda.mercadona.es como precios "scraper"
 * para un supermercado ya existente en tu base de datos.
 *
 * ANTES DE USARLO, LEE ESTO:
 *
 * 1. Legal: la web de Mercadona probablemente prohíbe en sus condiciones de
 *    uso la extracción automatizada de su catálogo. Este script es tuyo y lo
 *    ejecutas bajo tu propia responsabilidad; no lo publiques ni lo dejes
 *    corriendo de forma masiva/continua sin haber revisado los términos.
 * 2. Mercadona no da precios por tienda física, sino por "almacén"/zona
 *    logística (el código `wh`, p. ej. asociado a un código postal). Todos
 *    los precios que importes con este script se aplicarán al ÚNICO
 *    supermercado que le indiques con --supermarket: elige el que mejor
 *    represente esa zona, o crea varios supermercados "virtuales" por zona
 *    si quieres más precisión.
 * 3. Probado contra la web real desde el entorno donde escribí esto y
 *    Mercadona respondió HTTP 403 (bloqueo de bot/WAF): sin cookies de
 *    sesión ni un User-Agent/huella de navegador real, su API rechaza la
 *    petición directamente. Este script, tal cual, probablemente NO
 *    funcione sin más trabajo (p. ej. lanzarlo con un navegador real vía
 *    Playwright/Puppeteer para conseguir cookies de sesión válidas, y aun
 *    así puede seguir bloqueado). Ejecuta primero con --dry-run para
 *    comprobar tu caso antes de dar nada por hecho.
 *
 * Uso:
 *   node scripts/import-mercadona.mjs --supermarket <uuid> --warehouse mad1 [opciones]
 *
 * Opciones:
 *   --supermarket <uuid>   Obligatorio. ID del supermercado en tu tabla `supermarkets`.
 *   --warehouse <código>   Obligatorio. Código de almacén/zona de Mercadona (p. ej. mad1).
 *                          Se ve en la pestaña Red del navegador al elegir tu código
 *                          postal en tienda.mercadona.es (parámetro `wh` de las
 *                          peticiones a /api/...).
 *   --category <id>        Opcional. Limita la importación a una categoría concreta.
 *   --limit <n>             Opcional. Máximo de productos a importar (por defecto: sin límite).
 *   --dry-run               No escribe nada en Supabase: solo muestra lo que encontraría.
 *
 * Variables de entorno requeridas (en .env.local o exportadas en tu shell):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (la "service_role" key de Supabase, NUNCA la anon key,
 *                                 y NUNCA la pongas en NEXT_PUBLIC_*. Solo se usa aquí,
 *                                 en un script que corres tú a mano desde tu máquina.)
 */

import { createClient } from "@supabase/supabase-js";

const API_BASE = "https://tienda.mercadona.es/api";
const REQUEST_DELAY_MS = 300;

function parseArgs(argv) {
  const args = { limit: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--supermarket") args.supermarket = argv[++i];
    else if (a === "--warehouse") args.warehouse = argv[++i];
    else if (a === "--category") args.category = argv[++i];
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, attempt = 1) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "valoramercados-import/0.1" },
  });
  if (!res.ok) {
    if (res.status >= 500 && attempt < 3) {
      await sleep(1000 * attempt);
      return fetchJson(url, attempt + 1);
    }
    throw new Error(`HTTP ${res.status} al pedir ${url}`);
  }
  return res.json();
}

/** Aplana el árbol de categorías de Mercadona en una lista de {id, name}. */
function flattenCategories(tree) {
  const out = [];
  const categories = Array.isArray(tree) ? tree : tree?.results ?? [];
  for (const cat of categories) {
    if (cat?.id != null) out.push({ id: cat.id, name: cat.name ?? String(cat.id) });
    if (Array.isArray(cat?.categories)) out.push(...flattenCategories(cat.categories));
  }
  return out;
}

/** Extrae los productos de la respuesta detallada de una categoría. */
function extractProducts(categoryDetail) {
  const products = [];
  const subcats = categoryDetail?.categories ?? [categoryDetail];
  for (const sub of subcats) {
    for (const p of sub?.products ?? []) {
      const priceStr = p?.price_instructions?.unit_price ?? p?.price_instructions?.bulk_price;
      const price = priceStr != null ? Number(priceStr) : NaN;
      const name = p?.display_name ?? p?.name;
      if (!name || !Number.isFinite(price) || price <= 0) continue;
      products.push({ name: String(name).trim(), price });
    }
  }
  return products;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.supermarket || !args.warehouse) {
    console.log(
      "Uso: node scripts/import-mercadona.mjs --supermarket <uuid> --warehouse <código> " +
        "[--category <id>] [--limit <n>] [--dry-run]"
    );
    process.exit(args.help ? 0 : 1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!args.dryRun && (!supabaseUrl || !serviceKey)) {
    console.error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.\n" +
        "(Puedes usar --dry-run para probar solo la parte de Mercadona, sin Supabase.)"
    );
    process.exit(1);
  }

  const supabase =
    !args.dryRun && supabaseUrl && serviceKey
      ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
      : null;

  if (supabase) {
    const { data: sm, error } = await supabase
      .from("supermarkets")
      .select("id, name, city")
      .eq("id", args.supermarket)
      .maybeSingle();
    if (error || !sm) {
      console.error(`No encuentro el supermercado ${args.supermarket} en tu base de datos.`);
      process.exit(1);
    }
    console.log(`Importando precios para: ${sm.name} (${sm.city})`);
  }

  console.log(`Descargando árbol de categorías (almacén ${args.warehouse})...`);
  const tree = await fetchJson(`${API_BASE}/categories/?lang=es&wh=${encodeURIComponent(args.warehouse)}`);
  let categories = flattenCategories(tree);

  if (args.category) categories = categories.filter((c) => String(c.id) === String(args.category));
  if (categories.length === 0) {
    console.error("No se encontraron categorías. Revisa el código de almacén o usa --dry-run para inspeccionar la respuesta cruda.");
    if (args.dryRun) console.log(JSON.stringify(tree, null, 2).slice(0, 4000));
    process.exit(1);
  }
  console.log(`${categories.length} categorías encontradas.`);

  let imported = 0;
  let productsUpserted = 0;
  const errors = [];

  for (const cat of categories) {
    if (args.limit && imported >= args.limit) break;
    try {
      const detail = await fetchJson(
        `${API_BASE}/categories/${cat.id}/?lang=es&wh=${encodeURIComponent(args.warehouse)}`
      );
      const products = extractProducts(detail);
      console.log(`· ${cat.name}: ${products.length} productos`);

      if (args.dryRun) {
        for (const p of products.slice(0, 5)) console.log(`    - ${p.name}: ${p.price.toFixed(2)} €`);
        imported += products.length;
        continue;
      }

      for (const p of products) {
        if (args.limit && imported >= args.limit) break;

        const { data: product, error: productError } = await supabase
          .from("products")
          .upsert({ name: p.name, brand: "", category: cat.name }, { onConflict: "name,brand" })
          .select("id")
          .single();
        if (productError || !product) {
          errors.push(`Producto "${p.name}": ${productError?.message ?? "error desconocido"}`);
          continue;
        }
        productsUpserted++;

        const { error: priceError } = await supabase.from("price_reports").insert({
          product_id: product.id,
          supermarket_id: args.supermarket,
          price: p.price,
          source: "scraper",
        });
        if (priceError) {
          errors.push(`Precio "${p.name}": ${priceError.message}`);
          continue;
        }
        imported++;
      }
    } catch (err) {
      errors.push(`Categoría "${cat.name}" (${cat.id}): ${err.message}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  console.log("\n— Resumen —");
  console.log(`Productos importados: ${productsUpserted}`);
  console.log(`Precios insertados: ${imported}`);
  if (errors.length) {
    console.log(`Errores (${errors.length}), primeros 10:`);
    errors.slice(0, 10).forEach((e) => console.log("  · " + e));
  }
}

main().catch((err) => {
  console.error("Fallo inesperado:", err);
  process.exit(1);
});
