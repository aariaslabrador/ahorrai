"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthState } from "@/app/auth/actions";

const initialState: AuthState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-bold text-neutral-900">Inicia sesión</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Accede para valorar supermercados y reportar precios.
      </p>

      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Email
          <input
            type="email"
            name="email"
            required
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Contraseña
          <input
            type="password"
            name="password"
            required
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </label>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-500">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-emerald-700 hover:underline">
          Regístrate
        </Link>
      </p>
    </div>
  );
}
