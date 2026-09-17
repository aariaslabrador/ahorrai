#!/usr/bin/env node
/**
 * Extrae productos y precios de fotos del folleto semanal de un supermercado
 * (Lidl u otro) usando la API de Claude (visión) y los inserta en Supabase
 * como precios de origen "flyer".
 *
 * Esto NO accede a la web del supermercado en ningún momento: las fotos (o
 * capturas/PDFs exportados a imagen) del folleto te las haces tú a mano,
 * navegando normalmente como cualquier visitante, y se las pasas a este
 * script como archivos locales. El script solo hace de OCR/parser sobre
 * esas imágenes.
 *
 * Uso:
 *   node scripts/import-flyer.mjs --supermarket <uuid> --file folleto-pag1.jpg [--file folleto-pag2.jpg ...] [--dry-run]
 *   node scripts/import-flyer.mjs --supermarket <uuid> --dir ./folletos/lidl-semana-38 [--dry-run]
 *
 * Opciones:
 *   --supermarket <uuid>   Obligatorio (salvo --dry-run sin Supabase). ID del supermercado.
 *   --file <ruta>           Una imagen del folleto. Repetible.
 *   --dir <carpeta>         Todas las imágenes (.jpg/.jpeg/.png/.webp) de una carpeta, en orden alfabético.
 *   --dry-run               No escribe nada en Supabase ni sube imágenes: solo muestra lo detectado.
 *
 * Variables de entorno requeridas:
 *   ANTHROPIC_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL       (no requerido en --dry-run)
 *   SUPABASE_SERVICE_ROLE_KEY      (no requerido en --dry-run; NUNCA la anon key)
 */

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { mediaTypeFor, uploadFlyerImage, insertFlyerProducts } from "./lib/flyerInsert.mjs";

const MODEL = "claude-sonnet-5";
const VALID_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const EXTRACT_TOOL = {
  name: "record_flyer_products",
  description: "Registra los productos y precios detectados en la imagen del folleto.",
  input_schema: {
    type: "object",
    properties: {
      products: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Nombre del producto tal como aparece en el folleto" },
            brand: { type: "string", description: "Marca, si se indica; si no, cadena vacía" },
            price: { type: "number", description: "Precio de oferta en euros, como número (ej. 1.99)" },
            unit: { type: "string", description: "Formato/unidad si se indica (ej. '500 g', '1 L'), si no cadena vacía" },
          },
          required: ["name", "brand", "price", "unit"],
        },
      },
    },
    required: ["products"],
  },
};

function parseArgs(argv) {
  const args = { files: [], dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--supermarket") args.supermarket = argv[++i];
    else if (a === "--file") args.files.push(argv[++i]);
    else if (a === "--dir") args.dir = argv[++i];
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

async function extractFromImage(client, filePath) {
  const bytes = fs.readFileSync(filePath);
  const mediaType = mediaTypeFor(filePath);

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "record_flyer_products" },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: bytes.toString("base64") } },
          {
            type: "text",
            text:
              "Esta es una página de un folleto de ofertas de supermercado. Extrae TODOS los " +
              "productos con precio visible llamando a record_flyer_products. Si un precio no se " +
              "lee con claridad, omite ese producto. No inventes productos ni precios que no veas " +
              "literalmente en la imagen.",
          },
        ],
      },
    ],
  });

  const toolUse = msg.content.find((b) => b.type === "tool_use" && b.name === "record_flyer_products");
  if (!toolUse) throw new Error("Claude no devolvió productos estructurados para " + filePath);
  return toolUse.input.products ?? [];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || (!args.dryRun && !args.supermarket) || (!args.files.length && !args.dir)) {
    console.log(
      "Uso: node scripts/import-flyer.mjs --supermarket <uuid> " +
        "(--file <img> [--file <img> ...] | --dir <carpeta>) [--dry-run]"
    );
    process.exit(args.help ? 0 : 1);
  }

  if (args.dir) {
    const entries = fs
      .readdirSync(args.dir)
      .filter((f) => VALID_EXT.has(path.extname(f).toLowerCase()))
      .sort();
    args.files.push(...entries.map((f) => path.join(args.dir, f)));
  }
  if (args.files.length === 0) {
    console.error("No se encontraron imágenes.");
    process.exit(1);
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.error("Falta ANTHROPIC_API_KEY en el entorno.");
    process.exit(1);
  }
  const client = new Anthropic({ apiKey: anthropicKey });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!args.dryRun && (!supabaseUrl || !serviceKey)) {
    console.error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.\n" +
        "(Puedes usar --dry-run para probar solo la extracción, sin Supabase.)"
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
    console.log(`Importando folleto para: ${sm.name} (${sm.city})`);
  }

  let totalDetected = 0;
  let totalInserted = 0;
  const errors = [];

  for (const file of args.files) {
    console.log(`\nAnalizando ${file}...`);
    let products;
    try {
      products = await extractFromImage(client, file);
    } catch (err) {
      errors.push(`${file}: ${err.message}`);
      continue;
    }
    console.log(`  ${products.length} productos detectados.`);
    totalDetected += products.length;

    if (args.dryRun) {
      for (const p of products) {
        console.log(
          `    - ${p.name}${p.brand ? ` (${p.brand})` : ""}: ${p.price.toFixed(2)} €${p.unit ? ` / ${p.unit}` : ""}`
        );
      }
      continue;
    }

    // Sube la imagen del folleto una vez y reutiliza la URL como evidencia de todos sus productos.
    const imageUrl = await uploadFlyerImage(supabase, args.supermarket, file, errors);
    totalInserted += await insertFlyerProducts(supabase, args.supermarket, products, imageUrl, errors);
  }

  console.log("\n— Resumen —");
  console.log(`Imágenes procesadas: ${args.files.length}`);
  console.log(`Productos detectados: ${totalDetected}`);
  console.log(`Precios insertados: ${totalInserted}`);
  if (errors.length) {
    console.log(`Errores (${errors.length}):`);
    errors.forEach((e) => console.log("  · " + e));
  }
}

main().catch((err) => {
  console.error("Fallo inesperado:", err);
  process.exit(1);
});
