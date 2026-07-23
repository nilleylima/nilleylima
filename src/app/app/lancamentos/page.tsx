"use client";

import { FormEvent, useEffect, useState } from "react";
import { format } from "date-fns";
import { formatBRL, parseMoneyToCents } from "@/lib/utils";
import { Trash2 } from "lucide-react";

type Account = { id: string; name: string };
type Category = { id: string; name: string; type: string };
type Tx = {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  account: { name: string };
  category: { name: string; color: string } | null;
};

export default function LancamentosPage() {
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [form, setForm] = useState({
    type: "expense",
    accountId: "",
    categoryId: "",
    amount: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });
  const [loading, setLoading] = useState(false);

  async function load() {
    const [txRes, accRes, catRes] = await Promise.all([
      fetch(`/api/transactions?month=${month}`),
      fetch("/api/accounts"),
      fetch("/api/categories"),
    ]);
    const txData = await txRes.json();
    const accData = await accRes.json();
    const catData = await catRes.json();
    setTransactions(txData.transactions || []);
    setAccounts(accData.accounts || []);
    setCategories(catData.categories || []);
    if (!form.accountId && accData.accounts?.[0]) {
      setForm((f) => ({ ...f, accountId: accData.accounts[0].id }));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const filteredCategories = categories.filter((c) => c.type === form.type);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        accountId: form.accountId,
        categoryId: form.categoryId || null,
        amount: parseMoneyToCents(form.amount),
        description: form.description,
        date: form.date,
      }),
    });
    setForm((f) => ({
      ...f,
      amount: "",
      description: "",
      date: format(new Date(), "yyyy-MM-dd"),
    }));
    setLoading(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir lançamento?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-800/50">
            Movimentações
          </p>
          <h1 className="font-display text-3xl font-bold text-ink-900">
            Lançamentos
          </h1>
        </div>
        <input
          type="month"
          className="input max-w-[180px]"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </div>

      <form onSubmit={onSubmit} className="surface grid gap-4 p-5 md:grid-cols-3">
        <div>
          <label className="label">Tipo</label>
          <select
            className="input"
            value={form.type}
            onChange={(e) =>
              setForm((f) => ({ ...f, type: e.target.value, categoryId: "" }))
            }
          >
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </select>
        </div>
        <div>
          <label className="label">Conta</label>
          <select
            className="input"
            value={form.accountId}
            onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
            required
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Categoria</label>
          <select
            className="input"
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
          >
            <option value="">Sem categoria</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Valor (R$)</label>
          <input
            className="input"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label">Data</label>
          <input
            type="date"
            className="input"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label">Descrição</label>
          <input
            className="input"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            required
          />
        </div>
        <div className="md:col-span-3">
          <button className="btn-primary" disabled={loading}>
            {loading ? "Salvando..." : "Adicionar lançamento"}
          </button>
        </div>
      </form>

      <div className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-mint-100/50 text-xs uppercase tracking-[0.08em] text-ink-800/60">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Conta</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {format(new Date(t.date), "dd/MM/yyyy")}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink-900">
                    {t.description}
                  </td>
                  <td className="px-4 py-3">
                    {t.category ? (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: t.category.color }}
                        />
                        {t.category.name}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">{t.account.name}</td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      t.type === "income" ? "text-mint-600" : "text-coral-600"
                    }`}
                  >
                    {t.type === "income" ? "+" : "-"}
                    {formatBRL(t.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => remove(t.id)}
                      className="rounded-lg p-2 text-ink-800/40 hover:bg-sand-100 hover:text-coral-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-ink-800/55">
                    Nenhum lançamento neste mês.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
