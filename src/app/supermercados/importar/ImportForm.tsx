"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  searchGooglePlaces,
  importSelectedPlaces,
  type PlaceCandidate,
} from "./actions";

type Status = "idle" | "searching" | "importing";

export default function ImportForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceCandidate[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setStatus("searching");
    startTransition(async () => {
      const res = await searchGooglePlaces(city, query);
      if (res.error) {
        setError(res.error);
        setResults(null);
      } else {
        setResults(res.results);
        setSelected(new Set(res.results.map((r, i) => (r.alreadyExists ? -1 : i)).filter((i) => i >= 0)));
      }
      setStatus("idle");
    });
  }

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function handleImport() {
    if (!results) return;
    const chosen = results.filter((_, i) => selected.has(i));
    if (chosen.length === 0) return;

    setStatus("importing");
    setError(null);
    startTransition(async () => {
      const res = await importSelectedPlaces(city, chosen);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMsg(`${res.created} supermercado${res.created === 1 ? "" : "s"} añadido${res.created === 1 ? "" : "s"}.`);
        setResults(null);
        setSelected(new Set());
        router.refresh();
      }
      setStatus("idle");
    });
  }

  const selectedCount = selected.size;

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 min-w-[160px] flex-col gap-1 text-sm font-medium text-neutral-700">
          Ciudad
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            placeholder="Ej. Córdoba"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </label>
        <label className="flex flex-1 min-w-[160px] flex-col gap-1 text-sm font-medium text-neutral-700">
          Qué buscar (opcional)
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="supermercado, Mercadona..."
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {status === "searching" ? "Buscando..." : "Buscar en Google Maps"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {successMsg && <p className="text-sm text-emerald-600">{successMsg}</p>}

      {results && results.length === 0 && (
        <p className="text-sm text-neutral-400">No se encontraron supermercados para esa búsqueda.</p>
      )}

      {results && results.length > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-700">
              {results.length} resultado{results.length === 1 ? "" : "s"} — {selectedCount} seleccionado
              {selectedCount === 1 ? "" : "s"}
            </p>
            <button
              type="button"
              onClick={handleImport}
              disabled={isPending || selectedCount === 0}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {status === "importing" ? "Importando..." : `Importar seleccionados (${selectedCount})`}
            </button>
          </div>

          <ul className="mt-3 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
            {results.map((r, i) => (
              <li key={`${r.name}-${r.address}`} className="flex items-start gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  disabled={r.alreadyExists}
                  onChange={() => toggle(i)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-neutral-800">
                    {r.name}{" "}
                    {r.alreadyExists && (
                      <span className="ml-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                        Ya existe
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500">{r.address}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
