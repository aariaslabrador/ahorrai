"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthState } from "@/app/auth/actions";

const initialState: AuthState = { error: null };

export default function RegistroPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-foreground">Crea tu cuenta</h1>
      <p className="mt-1 text-sm text-muted">
        Únete para descubrir y compartir las mejores ofertas de tu ciudad.
      </p>

      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-muted">
          Nombre
          <input
            type="text"
            name="full_name"
            required
            className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-muted">
          Email
          <input
            type="email"
            name="email"
            required
            className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-muted">
          Contraseña
          <input
            type="password"
            name="password"
            required
            minLength={6}
            className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
          />
        </label>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
        >
          {pending ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-accent-700 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
