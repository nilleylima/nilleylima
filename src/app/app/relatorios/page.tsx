"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Download } from "lucide-react";
import { formatBRL } from "@/lib/utils";

type Report = {
  month: string;
  income: number;
  expense: number;
  net: number;
  byCategory: { name: string; color: string; type: string; amount: number }[];
};

export default function RelatoriosPage() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    fetch(`/api/reports?month=${month}`)
      .then((r) => r.json())
      .then(setReport);
  }, [month]);

  const expenseCats =
    report?.byCategory.filter((c) => c.type === "expense").map((c) => ({
      name: c.name,
      value: c.amount / 100,
      color: c.color,
    })) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-800/50">
            Análise
          </p>
          <h1 className="font-display text-3xl font-bold text-ink-900">
            Relatórios
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            type="month"
            className="input max-w-[180px]"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <a
            href={`/api/reports?month=${month}&format=csv`}
            className="btn-secondary"
          >
            <Download size={16} /> Exportar CSV
          </a>
        </div>
      </div>

      {!report ? (
        <p className="text-ink-800/60">Carregando...</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="surface p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-800/50">
                Receitas
              </p>
              <p className="mt-3 font-display text-2xl font-bold text-mint-600">
                {formatBRL(report.income)}
              </p>
            </div>
            <div className="surface p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-800/50">
                Despesas
              </p>
              <p className="mt-3 font-display text-2xl font-bold text-coral-600">
                {formatBRL(report.expense)}
              </p>
            </div>
            <div className="surface p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-800/50">
                Resultado
              </p>
              <p
                className={`mt-3 font-display text-2xl font-bold ${
                  report.net >= 0 ? "text-mint-600" : "text-coral-600"
                }`}
              >
                {formatBRL(report.net)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="surface p-5">
              <h2 className="font-display text-xl font-bold text-ink-900">
                Despesas por categoria
              </h2>
              {expenseCats.length === 0 ? (
                <p className="mt-8 text-sm text-ink-800/55">Sem dados.</p>
              ) : (
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseCats}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={90}
                      >
                        {expenseCats.map((e) => (
                          <Cell key={e.name} fill={e.color} />
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
            </div>

            <div className="surface p-5">
              <h2 className="font-display text-xl font-bold text-ink-900">
                Detalhamento
              </h2>
              <ul className="mt-4 space-y-3">
                {report.byCategory.map((c) => (
                  <li
                    key={`${c.type}-${c.name}`}
                    className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3 text-sm last:border-0"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: c.color }}
                      />
                      <span>
                        {c.name}{" "}
                        <span className="text-ink-800/45">
                          ({c.type === "income" ? "receita" : "despesa"})
                        </span>
                      </span>
                    </span>
                    <span className="font-semibold">{formatBRL(c.amount)}</span>
                  </li>
                ))}
                {report.byCategory.length === 0 && (
                  <li className="text-ink-800/55">Nenhum lançamento no período.</li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
