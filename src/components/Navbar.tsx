import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-neutral-900">
          <span className="text-xl">🛒</span> ValoraMercados
        </Link>

        <div className="hidden items-center gap-6 text-sm font-medium text-neutral-600 sm:flex">
          <Link href="/supermercados" className="hover:text-emerald-700">
            Supermercados
          </Link>
          <Link href="/ofertas" className="hover:text-emerald-700">
            Ofertas
          </Link>
          {user && (
            <Link href="/precios/nuevo" className="hover:text-emerald-700">
              Reportar precio
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <form action={signOut} className="flex items-center gap-3">
              <span className="hidden text-sm text-neutral-500 sm:inline">{user.email}</span>
              <button
                type="submit"
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Salir
              </button>
            </form>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Entrar
              </Link>
              <Link
                href="/registro"
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
