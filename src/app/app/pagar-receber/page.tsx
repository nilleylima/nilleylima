"use client";

import { FormEvent, useEffect, useState } from "react";
import { format } from "date-fns";
import { BILL_STATUS, formatBRL, parseMoneyToCents } from "@/lib/utils";
import { Check, Trash2 } from "lucide-react";

type Account = { id: string; name: string };
type Category = { id: string; name: string; type: string };
type Bill = {
  id: string;
  type: string;
  amount: number;
  description: string;
  dueDate: string;
  status: string;
  category: { name: string; color: string } | null;
};

export default function PagarReceberPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({
    type: "payable",
    amount: "",
    description: "",
    dueDate: format(new Date(), "yyyy-MM-dd"),
    categoryId: "",
    accountId: "",
  });
  const [loading, setLoading] = useState(false);

  async function load() {
    const qs = filter === "all" ? "" : `?type=${filter}`;
    const [bRes, aRes, cRes] = await Promise.all([
      fetch(`/api/bills${qs}`),
      fetch("/api/accounts"),
      fetch("/api/categories"),
    ]);
    const bData = await bRes.json();
    const aData = await aRes.json();
    const cData = await cRes.json();
    setBills(bData.bills || []);
    setAccounts(aData.accounts || []);
    setCategories(cData.categories || []);
    if (!form.accountId && aData.accounts?.[0]) {
      setForm((f) => ({ ...f, accountId: aData.accounts[0].id }));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const catType = form.type === "payable" ? "expense" : "income";
  const filteredCats = categories.filter((c) => c.type === catType);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        amount: parseMoneyToCents(form.amount),
        description: form.description,
        dueDate: form.dueDate,
        categoryId: form.categoryId || null,
        accountId: form.accountId || null,
      }),
    });
    setForm((f) => ({
      ...f,
      amount: "",
      description: "",
      dueDate: format(new Date(), "yyyy-MM-dd"),
    }));
    setLoading(false);
    load();
  }

  async function pay(id: string) {
    const accountId = form.accountId || accounts[0]?.id;
    if (!accountId) {
      alert("Cadastre uma conta primeiro.");
      return;
    }
    await fetch(`/api/bills/${id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir este registro?")) return;
    await fetch(`/api/bills/${id}`, { method: "DELETE" });
    // need DELETE on bills/[id] - I only created pay route. Let me add delete via bills route or create DELETE
    // Actually I wrote DELETE on bills/[id]/pay - wrong. I need bills/[id]/route.ts for DELETE
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-800/50">
            Agenda financeira
          </p>
          <h1 className="font-display text-3xl font-bold text-ink-900">
            Pagar / Receber
          </h1>
        </div>
        <div className="flex gap-2">
          {[
            { id: "all", label: "Todos" },
            { id: "payable", label: "A pagar" },
            { id: "receivable", label: "A receber" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={
                filter === f.id ? "btn-primary !py-2" : "btn-secondary !py-2"
              }
            >
              {f.label}
            </button>
          ))}
        </div>
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
            <option value="payable">Conta a pagar</option>
            <option value="receivable">Conta a receber</option>
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
          <label className="label">Vencimento</label>
          <input
            type="date"
            className="input"
            value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            required
          />
        </div>
        <div className="md:col-span-2">
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
        <div>
          <label className="label">Categoria</label>
          <select
            className="input"
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
          >
            <option value="">Sem categoria</option>
            {filteredCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="label">Conta para baixa</label>
          <select
            className="input max-w-md"
            value={form.accountId}
            onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <button className="btn-primary" disabled={loading}>
            {loading ? "Salvando..." : "Adicionar"}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {bills.map((b) => (
          <div key={b.id} className="surface flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink-900">{b.description}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    b.status === "paid"
                      ? "bg-mint-100 text-mint-600"
                      : b.status === "overdue"
                        ? "bg-coral-500/10 text-coral-600"
                        : "bg-sand-100 text-ink-800/70"
                  }`}
                >
                  {BILL_STATUS[b.status] || b.status}
                </span>
                <span className="text-xs text-ink-800/50">
                  {b.type === "payable" ? "A pagar" : "A receber"}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-800/55">
                Vence em {format(new Date(b.dueDate), "dd/MM/yyyy")}
                {b.category ? ` · ${b.category.name}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p
                className={`font-display text-xl font-bold ${
                  b.type === "payable" ? "text-coral-600" : "text-mint-600"
                }`}
              >
                {formatBRL(b.amount)}
              </p>
              {b.status !== "paid" && (
                <button
                  onClick={() => pay(b.id)}
                  className="btn-secondary !px-3 !py-2"
                  title="Marcar como pago"
                >
                  <Check size={16} />
                </button>
              )}
              <button
                onClick={() => remove(b.id)}
                className="rounded-lg p-2 text-ink-800/40 hover:bg-sand-100 hover:text-coral-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {bills.length === 0 && (
          <p className="text-sm text-ink-800/55">Nenhum registro encontrado.</p>
        )}
      </div>
    </div>
  );
}
