"use client";

import { useState, useTransition } from "react";
import { addExistingProductToBasket } from "@/app/cesta/actions";

export default function AddToBasketButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      const result = await addExistingProductToBasket(productId, 1);
      setError(result.error);
      setDone(!result.error);
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-full border border-accent-300 px-2.5 py-1 text-xs font-medium text-accent-700 hover:bg-accent-50 disabled:opacity-60"
      >
        {done ? "✓ En tu cartera" : isPending ? "Añadiendo..." : "+ Cartera"}
      </button>
      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </span>
  );
}
