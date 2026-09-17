"use client";

import { useState } from "react";
import Link from "next/link";
import { distanceKm } from "@/lib/geo";
import { compareBasketAcrossSupermarkets, type SupermarketBasketTotal } from "./actions";

type Supermarket = { id: string; name: string; city: string; lat: number; lng: number };

type ResultRow = SupermarketBasketTotal & { distanceKm: number | null };

type Status = "idle" | "locating" | "comparing" | "error";

const NEAREST_LIMIT = 8;

export default function ComparePanel({
  supermarkets,
  cities,
  totalItems,
}: {
  supermarkets: Supermarket[];
  cities: string[];
  totalItems: number;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [selectedCity, setSelectedCity] = useState("");

  async function runComparison(ids: string[], distances: Map<string, number>) {
    setStatus("comparing");
    try {
      const comparison = await compareBasketAcrossSupermarkets(ids);
      setResults(
        comparison.map((c) => ({ ...c, distanceKm: distances.get(c.supermarket_id) ?? null }))
      );
      setStatus("idle");
    } catch {
      setErrorMsg("No se pudo comparar los precios. Inténtalo de nuevo.");
      setStatus("error");
    }
  }

  function handleUseLocation() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setErrorMsg("Tu navegador no soporta geolocalización. Elige una ciudad.");
      return;
    }

    setStatus("locating");
    setErrorMsg("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const withDistance = supermarkets
          .map((s) => ({ ...s, distance: distanceKm(latitude, longitude, s.lat, s.lng) }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, NEAREST_LIMIT);

        const distances = new Map(withDistance.map((s) => [s.id, s.distance]));
        runComparison(
          withDistance.map((s) => s.id),
          distances
        );
      },
      () => {
        setStatus("error");
        setErrorMsg("No se pudo acceder a tu ubicación. Prueba a elegir una ciudad.");
      },
      { timeout: 10000 }
    );
  }

  function handleCityCompare() {
    if (!selectedCity) return;
    const inCity = supermarkets.filter((s) => s.city === selectedCity);
    runComparison(
      inCity.map((s) => s.id),
      new Map()
    );
  }

  const cheapestComplete = results?.find((r) => r.itemsMissing === 0);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-sm font-semibold text-neutral-800">Cotiza tu cartera en supermercados cercanos</p>
      <p className="mt-1 text-xs text-neutral-500">
        Usamos tu ubicación para encontrar los supermercados más cercanos y sumar el precio de tu
        cartera en cada uno con los últimos precios reportados por la comunidad.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={status === "locating" || status === "comparing" || totalItems === 0}
          className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700 disabled:opacity-60"
        >
          {status === "locating" ? "Localizando..." : "📍 Cotizar cerca de mí"}
        </button>

        <span className="text-xs text-neutral-400">o</span>

        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Elige una ciudad</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleCityCompare}
          disabled={!selectedCity || status === "comparing" || totalItems === 0}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 disabled:opacity-60"
        >
          Cotizar en esta ciudad
        </button>
      </div>

      {totalItems === 0 && (
        <p className="mt-3 text-sm text-neutral-400">Añade productos a tu cartera para poder cotizarla.</p>
      )}

      {status === "error" && <p className="mt-3 text-sm text-red-600">{errorMsg}</p>}
      {status === "comparing" && <p className="mt-3 text-sm text-neutral-500">Cotizando precios...</p>}

      {results && results.length === 0 && status === "idle" && (
        <p className="mt-3 text-sm text-neutral-400">
          No hay supermercados con precios reportados en esa zona todavía.
        </p>
      )}

      {results && results.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {results.map((r) => {
            const isCheapest = cheapestComplete?.supermarket_id === r.supermarket_id;
            return (
              <li
                key={r.supermarket_id}
                className={`rounded-lg border px-4 py-3 ${
                  isCheapest ? "border-accent-400 bg-accent-50" : "border-neutral-200"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link
                      href={`/supermercados/${r.supermarket_id}`}
                      className="font-semibold text-neutral-900 hover:underline"
                    >
                      {r.supermarket_name}
                    </Link>
                    <p className="text-xs text-neutral-500">
                      {r.supermarket_city}
                      {r.distanceKm !== null && ` · ${r.distanceKm.toFixed(1)} km`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-accent-700">{r.total.toFixed(2)} €</p>
                    {isCheapest && (
                      <span className="text-xs font-medium text-accent-600">🏆 Mejor cotización</span>
                    )}
                  </div>
                </div>
                {r.itemsMissing > 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    Faltan {r.itemsMissing} de {totalItems} productos por reportar aquí:{" "}
                    {r.missingProductNames.join(", ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
