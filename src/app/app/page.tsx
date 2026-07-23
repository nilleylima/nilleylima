"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { formatBRL } from "@/lib/utils";
import Link from "next/link";

type DashboardData = {
  totalBalance: number;
  income: number;
  expense: number;
  net: number;
  byCategory: { name: string; color: string; amount: number }[];
  cashflow: { label: string; income: number; expense: number }[];
  upcomingBills: {
    id: string;
    description: string;
    amount: number;
    dueDate: string;
    type: string;
    status: string;
  }[];
  month: string;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));

  useEffect(() => {
    fetch(`/api/dashboard?month=${month}`)
      .then((r) => r.json())
      .then(setData);
  }, [month]);

  if (!data) {
    return <p className="text-ink-800/60">Carregando dashboard...</p>;
  }

  const pieData = data.byCategory.map((c) => ({
    name: c.name,
    value: c.amount / 100,
    color: c.color,
  }));

  const chartData = data.cashflow.map((c) => ({
    label: c.label,
    receitas: c.income / 100,
    despesas: c.expense / 100,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-800/50">
            Visão geral
          </p>
          <h1 className="font-display text-3xl font-bold text-ink-900 md:text-4xl">
            Dashboard
          </h1>
        </div>
        <input
          type="month"
          className="input max-w-[180px]"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Saldo total", value: data.totalBalance, tone: "text-ink-900" },
          { label: "Receitas", value: data.income, tone: "text-mint-600" },
          { label: "Despesas", value: data.expense, tone: "text-coral-600" },
          { label: "Resultado", value: data.net, tone: data.net >= 0 ? "text-mint-600" : "text-coral-600" },
        ].map((card, i) => (
          <div
            key={card.label}
            className="surface p-5 animate-rise"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-800/50">
              {card.label}
            </p>
            <p className={`mt-3 font-display text-2xl font-bold ${card.tone}`}>
              {formatBRL(card.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="surface p-5 lg:col-span-3">
          <h2 className="font-display text-xl font-bold text-ink-900">
            Fluxo dos últimos meses
          </h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2dbcf" />
                <XAxis dataKey="label" tick={{ fill: "#0b3d3a99", fontSize: 12 }} />
                <YAxis tick={{ fill: "#0b3d3a99", fontSize: 12 }} />
                <Tooltip
                  formatter={(value) =>
                    formatBRL(Math.round(Number(value) * 100))
                  }
                />
                <Bar dataKey="receitas" fill="#0F766E" radius={[6, 6, 0, 0]} />
                <Bar dataKey="despesas" fill="#C45C3E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface p-5 lg:col-span-2">
          <h2 className="font-display text-xl font-bold text-ink-900">
            Despesas por categoria
          </h2>
          {pieData.length === 0 ? (
            <p className="mt-8 text-sm text-ink-800/60">Sem despesas no período.</p>
          ) : (
            <div className="mt-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      formatBRL(Math.round(Number(value) * 100))
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <ul className="mt-2 space-y-2">
            {data.byCategory.slice(0, 5).map((c) => (
              <li key={c.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: c.color }}
                  />
                  {c.name}
                </span>
                <span className="font-semibold">{formatBRL(c.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="surface p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-ink-900">
            Próximos vencimentos
          </h2>
          <Link href="/app/pagar-receber" className="text-sm font-semibold text-mint-600">
            Ver todos
          </Link>
        </div>
        {data.upcomingBills.length === 0 ? (
          <p className="mt-4 text-sm text-ink-800/60">Nenhum vencimento aberto.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--line)]">
            {data.upcomingBills.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-semibold text-ink-900">{b.description}</p>
                  <p className="text-ink-800/55">
                    {b.type === "payable" ? "A pagar" : "A receber"} ·{" "}
                    {format(new Date(b.dueDate), "dd/MM/yyyy")}
                  </p>
                </div>
                <p
                  className={
                    b.type === "payable"
                      ? "font-bold text-coral-600"
                      : "font-bold text-mint-600"
                  }
                >
                  {formatBRL(b.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
