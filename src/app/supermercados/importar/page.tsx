import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ImportForm from "./ImportForm";

export default async function ImportarSupermercadosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-900">Importar supermercados desde Google Maps</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Busca una ciudad, revisa los resultados y elige cuáles añadir a ahorrAI. Los que ya
        existen aparecen marcados y no se pueden duplicar.
      </p>

      <div className="mt-6">
        <ImportForm />
      </div>
    </div>
  );
}
