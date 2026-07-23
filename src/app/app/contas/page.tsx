"use client";

import { FormEvent, useEffect, useState } from "react";
import { ACCOUNT_TYPES, formatBRL, parseMoneyToCents } from "@/lib/utils";
import { Trash2 } from "lucide-react";

type Account = {
  id: string;
  name: string;
  type: string;
  balance: number;
  color: string;
};

export default function ContasPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("checking");
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/accounts");
    const data = await res.json();
    setAccounts(data.accounts || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        balance: parseMoneyToCents(balance),
      }),
    });
    setName("");
    setBalance("0");
    setLoading(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta conta e seus lançamentos?")) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-800/50">
          Carteiras
        </p>
        <h1 className="font-display text-3xl font-bold text-ink-900">Contas</h1>
      </div>

      <form onSubmit={onSubmit} className="surface grid gap-4 p-5 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="label">Nome</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Nubank"
            required
          />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {Object.entries(ACCOUNT_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Saldo inicial (R$)</label>
          <input
            className="input"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
          />
        </div>
        <div className="md:col-span-4">
          <button className="btn-primary" disabled={loading}>
            {loading ? "Salvando..." : "Adicionar conta"}
          </button>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((a) => (
          <div key={a.id} className="surface overflow-hidden">
            <div className="h-1.5" style={{ background: a.color }} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-bold text-ink-900">
                    {a.name}
                  </p>
                  <p className="text-sm text-ink-800/55">
                    {ACCOUNT_TYPES[a.type] || a.type}
                  </p>
                </div>
                <button
                  onClick={() => remove(a.id)}
                  className="rounded-lg p-2 text-ink-800/40 hover:bg-sand-100 hover:text-coral-600"
                  aria-label="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="mt-6 font-display text-2xl font-bold text-ink-900">
                {formatBRL(a.balance)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
