"use client";

import { useActionState, useState } from "react";
import { rateSupermarket, type RateState } from "./actions";

const initialState: RateState = { error: null };

const CRITERIA: { key: "cleanliness" | "service" | "organization" | "price"; label: string }[] = [
  { key: "cleanliness", label: "Limpieza" },
  { key: "service", label: "Atención" },
  { key: "organization", label: "Organización" },
  { key: "price", label: "Precio" },
];

function StarPicker({
  name,
  value,
  onChange,
}: {
  name: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div
      className="flex gap-0.5 text-lg text-amber-500"
      onMouseLeave={() => setHovered(0)}
      role="radiogroup"
      aria-label={name}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          onMouseEnter={() => setHovered(n)}
          onClick={() => onChange(n)}
          aria-label={`${n} estrellas`}
          className="leading-none"
        >
          {n <= (hovered || value) ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}

function YesNoToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-neutral-700">{label}</span>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
            value === true
              ? "border-accent-500 bg-accent-50 text-accent-700"
              : "border-neutral-300 text-neutral-500 hover:bg-neutral-50"
          }`}
        >
          Sí
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
            value === false
              ? "border-red-400 bg-red-50 text-red-600"
              : "border-neutral-300 text-neutral-500 hover:bg-neutral-50"
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}

export default function RatingForm({ supermarketId }: { supermarketId: string }) {
  const [state, formAction, pending] = useActionState(rateSupermarket, initialState);
  const [scores, setScores] = useState<Record<string, number>>({
    cleanliness: 0,
    service: 0,
    organization: 0,
    price: 0,
  });
  const [hasFishCounter, setHasFishCounter] = useState<boolean | null>(null);
  const [hasButcher, setHasButcher] = useState<boolean | null>(null);

  const allScored = CRITERIA.every((c) => scores[c.key] > 0);
  const canSubmit = allScored && hasFishCounter !== null && hasButcher !== null;

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-sm font-semibold text-neutral-800">Valora este supermercado</p>

      <input type="hidden" name="supermarket_id" value={supermarketId} readOnly />
      {CRITERIA.map((c) => (
        <input key={c.key} type="hidden" name={c.key} value={scores[c.key]} readOnly />
      ))}
      <input
        type="hidden"
        name="has_fish_counter"
        value={hasFishCounter === null ? "" : String(hasFishCounter)}
        readOnly
      />
      <input type="hidden" name="has_butcher" value={hasButcher === null ? "" : String(hasButcher)} readOnly />

      <div className="flex flex-col gap-2">
        {CRITERIA.map((c) => (
          <div key={c.key} className="flex items-center justify-between gap-2">
            <span className="text-sm text-neutral-700">{c.label}</span>
            <StarPicker
              name={c.label}
              value={scores[c.key]}
              onChange={(n) => setScores((prev) => ({ ...prev, [c.key]: n }))}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3">
        <YesNoToggle label="🐟 ¿Tiene pescadería?" value={hasFishCounter} onChange={setHasFishCounter} />
        <YesNoToggle label="🥩 ¿Tiene carnicería?" value={hasButcher} onChange={setHasButcher} />
      </div>

      <textarea
        name="comment"
        rows={2}
        placeholder="Comentario (opcional)"
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
      />

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-accent-600">¡Gracias por tu valoración!</p>}

      <button
        type="submit"
        disabled={pending || !canSubmit}
        className="self-start rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar valoración"}
      </button>
    </form>
  );
}
