"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });
      if (err) throw err;
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setInfo(
          "Revisa tu email para confirmar la cuenta (si tu proyecto Supabase lo exige).",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="font-display text-3xl">
        Arquitecta
      </Link>
      <h1 className="mt-8 text-2xl font-medium">Crear cuenta</h1>
      <p className="mt-2 text-sm text-ink-600">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="underline">
          Entrar
        </Link>
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm">
          <span className="text-ink-600">Nombre</span>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full border border-ink-200 bg-white px-3 py-2 outline-none focus:border-ink-500"
          />
        </label>
        <label className="block text-sm">
          <span className="text-ink-600">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-ink-200 bg-white px-3 py-2 outline-none focus:border-ink-500"
          />
        </label>
        <label className="block text-sm">
          <span className="text-ink-600">Contraseña</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-ink-200 bg-white px-3 py-2 outline-none focus:border-ink-500"
          />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        {info && <p className="text-sm text-ink-700">{info}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ink-950 py-2.5 text-sm font-medium text-ink-50 disabled:opacity-60"
        >
          {loading ? "Creando…" : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
}
