const STOPWORDS = new Set([
  "de", "del", "la", "el", "los", "las", "con", "sin", "y", "al", "en", "para", "un", "una",
]);

const UNIT_REGEX = /(\d+(?:[.,]\d+)?)\s?(kg|g|l|ml|cl|ud|uds|unidades)\b/i;

/** Símbolo corto tipo "ticker" derivado del nombre del producto, ej. "Aceite de oliva 1L" → "ACE-1L". */
export function productSymbol(name: string): string {
  const clean = name.trim();
  if (!clean) return "—";

  const unitMatch = clean.match(UNIT_REGEX);
  const words = clean
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w.toLowerCase()));

  const base = (words[0] ?? clean).slice(0, 3).toUpperCase();

  if (unitMatch) {
    const qty = unitMatch[1].replace(",", ".");
    const unit = unitMatch[2].toUpperCase().replace(/^UDS?$/, "UD");
    return `${base}-${qty}${unit}`;
  }

  const second = words[1]?.slice(0, 3).toUpperCase();
  return second ? `${base}-${second}` : base;
}
