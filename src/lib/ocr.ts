import { createWorker } from "tesseract.js";

export type OcrResult = {
  rawText: string;
  confidence: number;
  priceCandidates: string[];
  bestGuess: string | null;
};

// Precios en formato europeo: 1.234,56 / 12,99 / 12.99 / 3€ ...
const PRICE_REGEX = /\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\b|\b\d{1,4}\b/g;

function extractPriceCandidates(text: string): string[] {
  const matches = text.match(PRICE_REGEX) ?? [];
  // Prioriza los números que parecen precios (con separador decimal).
  const withDecimals = matches.filter((m) => /[.,]\d{2}$/.test(m));
  const pool = withDecimals.length > 0 ? withDecimals : matches;

  return Array.from(new Set(pool)).map((m) => m.replace(/\./g, "").replace(",", "."));
}

export async function runOcr(file: File): Promise<OcrResult> {
  const worker = await createWorker("spa");

  try {
    const {
      data: { text, confidence },
    } = await worker.recognize(file);

    const priceCandidates = extractPriceCandidates(text);

    return {
      rawText: text.trim(),
      confidence,
      priceCandidates,
      bestGuess: priceCandidates[0] ?? null,
    };
  } finally {
    await worker.terminate();
  }
}
