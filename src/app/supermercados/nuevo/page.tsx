import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddSupermarketForm from "./AddSupermarketForm";

export default async function NuevoSupermercadoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-neutral-900">Añadir supermercado</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Ayuda a la comunidad localizando un supermercado de tu ciudad.
      </p>

      <div className="mt-6">
        <AddSupermarketForm />
      </div>
    </div>
  );
}
