"use client";

import { useActionState } from "react";
import { addProductByName, type BasketActionState } from "./actions";

const initialState: BasketActionState = { error: null };

export default function AddProductForm({ knownProducts }: { knownProducts: string[] }) {
  const [state, formAction, pending] = useActionState(addProductByName, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-1 min-w-[160px] flex-col gap-1 text-sm font-medium text-neutral-700">
        Producto
        <input
          name="product_name"
          list="productos-conocidos"
          required
          placeholder="Ej. Leche entera 1L"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
        />
        <datalist id="productos-conocidos">
          {knownProducts.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </label>
      <label className="flex w-28 flex-col gap-1 text-sm font-medium text-neutral-700">
        Marca
        <input
          name="brand"
          placeholder="Opcional"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
        />
      </label>
      <label className="flex w-20 flex-col gap-1 text-sm font-medium text-neutral-700">
        Cant.
        <input
          name="quantity"
          type="number"
          min={1}
          defaultValue={1}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700 disabled:opacity-60"
      >
        {pending ? "Añadiendo..." : "Añadir"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
