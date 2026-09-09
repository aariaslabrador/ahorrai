"use client";

import { useActionState, useState } from "react";
import { rateSupermarket, type RateState } from "./actions";

const initialState: RateState = { error: null };

export default function RatingForm({ supermarketId }: { supermarketId: string }) {
  const [state, formAction, pending] = useActionState(rateSupermarket, initialState);
  const [hovered, setHovered] = useState(0);
  const [score, setScore] = useState(0);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-sm font-semibold text-neutral-800">Valora este supermercado</p>

      <input type="hidden" name="supermarket_id" value={supermarketId} />
      <input type="hidden" name="score" value={score} />

      <div
        className="flex gap-1 text-2xl text-amber-500"
        onMouseLeave={() => setHovered(0)}
        role="radiogroup"
        aria-label="Puntuación"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            onMouseEnter={() => setHovered(n)}
            onClick={() => setScore(n)}
            aria-label={`${n} estrellas`}
            className="leading-none"
          >
            {n <= (hovered || score) ? "★" : "☆"}
          </button>
        ))}
      </div>

      <textarea
        name="comment"
        rows={2}
        placeholder="Comentario (opcional)"
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
      />

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">¡Gracias por tu valoración!</p>}

      <button
        type="submit"
        disabled={pending || score === 0}
        className="self-start rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar valoración"}
      </button>
    </form>
  );
}
