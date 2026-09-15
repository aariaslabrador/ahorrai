"use client";

import { useActionState, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { runOcr, type OcrResult } from "@/lib/ocr";
import { reportPrice, type ReportPriceState } from "./actions";

const initialState: ReportPriceState = { error: null };

type Supermarket = { id: string; name: string; city: string };

type Status = "idle" | "processing" | "ready" | "error";

export default function ReportPriceForm({
  supermarkets,
  defaultSupermarketId,
}: {
  supermarkets: Supermarket[];
  defaultSupermarketId?: string;
}) {
  const [state, formAction, pending] = useActionState(reportPrice, initialState);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));
    setStatus("processing");
    setStatusMessage("Leyendo el precio de la foto y subiéndola...");
    setImageUrl("");
    setOcrResult(null);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;

      const [ocr, upload] = await Promise.all([
        runOcr(file).catch(() => null),
        supabase.storage.from("price-photos").upload(path, file),
      ]);

      if (upload.error || !upload.data) {
        setStatus("error");
        setStatusMessage("No se pudo subir la foto. Inténtalo de nuevo.");
        return;
      }

      const { data: publicUrl } = supabase.storage.from("price-photos").getPublicUrl(upload.data.path);
      setImageUrl(publicUrl.publicUrl);

      if (ocr) {
        setOcrResult(ocr);
        if (ocr.bestGuess) setPrice(ocr.bestGuess);
      }

      setStatus("ready");
      setStatusMessage(
        ocr?.bestGuess
          ? "Precio detectado automáticamente. Revísalo antes de enviar."
          : "No se detectó el precio automáticamente, introdúcelo manualmente."
      );
    } catch {
      setStatus("error");
      setStatusMessage("Ocurrió un error procesando la imagen.");
    }
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Supermercado
          <select
            name="supermarket_id"
            required
            defaultValue={defaultSupermarketId ?? ""}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="" disabled>
              Selecciona un supermercado
            </option>
            {supermarkets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.city})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Producto
          <input
            name="product_name"
            required
            placeholder="Ej. Leche entera 1L"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Marca (opcional)
          <input
            name="brand"
            placeholder="Ej. Hacendado"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Foto del precio / etiqueta
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            required
            onChange={handleFileChange}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-emerald-700"
          />
        </label>

        {statusMessage && (
          <p className={`text-sm ${status === "error" ? "text-red-600" : "text-neutral-500"}`}>
            {status === "processing" && "⏳ "}
            {statusMessage}
          </p>
        )}

        {ocrResult && ocrResult.priceCandidates.length > 1 && (
          <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
            Otros valores detectados:
            {ocrResult.priceCandidates.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setPrice(c)}
                className="rounded-full border border-neutral-300 px-2 py-0.5 hover:border-emerald-400 hover:text-emerald-700"
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Precio (€)
          <input
            name="price"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </label>

        <input type="hidden" name="image_url" value={imageUrl} />
        <input type="hidden" name="ocr_raw_text" value={ocrResult?.rawText ?? ""} />
        <input type="hidden" name="ocr_confidence" value={ocrResult?.confidence ?? ""} />

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending || status !== "ready" || !imageUrl}
          className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Enviando..." : "Enviar precio"}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-neutral-700">Vista previa</p>
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Foto del precio" className="max-h-96 w-full rounded-xl border border-neutral-200 object-contain" />
        ) : (
          <div className="flex h-64 w-full items-center justify-center rounded-xl border border-dashed border-neutral-300 text-sm text-neutral-400">
            La foto aparecerá aquí
          </div>
        )}
      </div>
    </form>
  );
}
