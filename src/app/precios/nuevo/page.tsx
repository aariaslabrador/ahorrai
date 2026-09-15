import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReportPriceForm from "./ReportPriceForm";

export default async function NuevoPrecioPage({
  searchParams,
}: {
  searchParams: Promise<{ supermarket?: string }>;
}) {
  const { supermarket } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: supermarkets } = await supabase
    .from("supermarkets")
    .select("id, name, city")
    .order("name");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-900">Reportar precio</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Haz una foto de la etiqueta del precio: intentaremos leerlo automáticamente para que solo
        tengas que confirmarlo.
      </p>

      <div className="mt-6">
        {supermarkets && supermarkets.length > 0 ? (
          <ReportPriceForm supermarkets={supermarkets} defaultSupermarketId={supermarket} />
        ) : (
          <p className="text-sm text-neutral-400">
            Todavía no hay supermercados registrados. Añade uno primero.
          </p>
        )}
      </div>
    </div>
  );
}
