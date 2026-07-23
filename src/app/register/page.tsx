"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Falha ao registrar");
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_#d8f3ea,_transparent_45%),radial-gradient(circle_at_80%_80%,_#e2dbcf,_transparent_40%)]" />
      <div className="relative w-full">
        <div className="mb-8 text-center">
          <Link href="/" className="font-display text-3xl font-extrabold text-ink-900">
            Fluxa
          </Link>
        </div>
        <form onSubmit={onSubmit} className="surface mx-auto w-full max-w-md p-8">
          <h1 className="font-display text-3xl font-bold text-ink-900">Criar conta</h1>
          <p className="mt-2 text-sm text-ink-800/65">
            Comece sua gestão financeira em minutos.
          </p>

          <div className="mt-8 space-y-4">
            <div>
              <label className="label" htmlFor="name">
                Nome
              </label>
              <input
                id="name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
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
                minLength={6}
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
            {loading ? "Criando..." : "Criar conta"}
          </button>

          <p className="mt-6 text-center text-sm text-ink-800/65">
            Já tem conta?{" "}
            <Link href="/login" className="font-semibold text-mint-600">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
