"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeBasketItem, updateBasketItemQuantity } from "./actions";

export type BasketListItem = {
  itemId: string;
  productId: string;
  name: string;
  brand: string;
  quantity: number;
};

export default function BasketList({ items }: { items: BasketListItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeQty(itemId: string, quantity: number) {
    startTransition(async () => {
      await updateBasketItemQuantity(itemId, quantity);
      router.refresh();
    });
  }

  function remove(itemId: string) {
    startTransition(async () => {
      await removeBasketItem(itemId);
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
        Tu cartera está vacía. Añade productos más abajo.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
      {items.map((item) => (
        <li key={item.itemId} className="flex items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="font-medium text-foreground">{item.name}</p>
            {item.brand && <p className="text-xs text-muted">{item.brand}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeQty(item.itemId, item.quantity - 1)}
              disabled={isPending}
              aria-label="Restar unidad"
              className="h-7 w-7 rounded-full border border-line text-sm leading-none hover:bg-surface-2 disabled:opacity-50"
            >
              −
            </button>
            <span className="w-6 text-center text-sm">{item.quantity}</span>
            <button
              type="button"
              onClick={() => changeQty(item.itemId, item.quantity + 1)}
              disabled={isPending}
              aria-label="Sumar unidad"
              className="h-7 w-7 rounded-full border border-line text-sm leading-none hover:bg-surface-2 disabled:opacity-50"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => remove(item.itemId)}
              disabled={isPending}
              className="ml-2 text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
            >
              Quitar
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
