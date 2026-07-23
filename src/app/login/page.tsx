"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("demo@fluxa.app");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Falha ao entrar");
      return;
    }
    router.push(search.get("next") || "/app");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="surface mx-auto w-full max-w-md p-8">
      <h1 className="font-display text-3xl font-bold text-ink-900">Entrar</h1>
      <p className="mt-2 text-sm text-ink-800/65">
        Acesse sua gestão financeira Fluxa.
      </p>

      <div className="mt-8 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-coral-500/10 px-3 py-2 text-sm text-coral-600">
          {error}
        </p>
      )}

      <button className="btn-primary mt-6 w-full" disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </button>

      <p className="mt-6 text-center text-sm text-ink-800/65">
        Não tem conta?{" "}
        <Link href="/register" className="font-semibold text-mint-600">
          Criar conta
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_#d8f3ea,_transparent_45%),radial-gradient(circle_at_80%_80%,_#e2dbcf,_transparent_40%)]" />
      <div className="relative w-full">
        <div className="mb-8 text-center">
          <Link href="/" className="font-display text-3xl font-extrabold text-ink-900">
            Fluxa
          </Link>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
