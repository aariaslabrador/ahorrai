"use client";

import { useActionState, useState } from "react";
import MapView from "@/components/MapView";
import { createSupermarket, type CreateSupermarketState } from "./actions";

const initialState: CreateSupermarketState = { error: null };
const DEFAULT_CENTER: [number, number] = [40.4168, -3.7038]; // Madrid

export default function AddSupermarketForm() {
  const [state, formAction, pending] = useActionState(createSupermarket, initialState);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Nombre
          <input
            name="name"
            required
            placeholder="Ej. Mercadona Gran Vía"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Cadena (opcional)
          <input
            name="chain"
            placeholder="Ej. Mercadona, Carrefour, Lidl..."
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Dirección
          <input
            name="address"
            required
            placeholder="Calle y número"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Ciudad
          <input
            name="city"
            required
            placeholder="Ej. Madrid"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
          />
        </label>

        <input type="hidden" name="lat" value={position?.lat ?? ""} />
        <input type="hidden" name="lng" value={position?.lng ?? ""} />

        <p className="text-xs text-neutral-500">
          {position
            ? `Ubicación seleccionada: ${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`
            : "Haz clic en el mapa para marcar la ubicación exacta."}
        </p>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Guardar supermercado"}
        </button>
      </div>

      <MapView
        markers={position ? [{ id: "nuevo", lat: position.lat, lng: position.lng, label: "Nueva ubicación" }] : []}
        center={position ? [position.lat, position.lng] : DEFAULT_CENTER}
        onMapClick={(lat, lng) => setPosition({ lat, lng })}
      />
    </form>
  );
}
