import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let cartCount = 0;
  if (user) {
    const { data: basket } = await supabase.from("baskets").select("id").eq("user_id", user.id).maybeSingle();
    if (basket) {
      const { data: items } = await supabase.from("basket_items").select("quantity").eq("basket_id", basket.id);
      cartCount = (items ?? []).reduce((sum, i) => sum + i.quantity, 0);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold text-neutral-900">
          <span className="text-xl">💹</span> ahorr<span className="text-accent-600">AI</span>
        </Link>

        <div className="hidden items-center gap-6 text-sm font-medium text-neutral-600 sm:flex">
          <Link href="/supermercados" className="hover:text-accent-700">
            Mercados
          </Link>
          <Link href="/ofertas" className="hover:text-accent-700">
            Cotizaciones
          </Link>
          {user && (
            <Link href="/precios/nuevo" className="hover:text-accent-700">
              Reportar precio
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <Link
              href="/cesta"
              aria-label="Mi cartera"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-lg hover:bg-neutral-100"
            >
              🛒
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          )}
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
                className="rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-700"
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
