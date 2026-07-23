import { NextRequest, NextResponse } from "next/server";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { getSession, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const monthParam = req.nextUrl.searchParams.get("month");
  const formatType = req.nextUrl.searchParams.get("format") || "json";
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    year = y;
    month = m - 1;
  }

  const from = startOfMonth(new Date(year, month, 1));
  const to = endOfMonth(from);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.id,
      date: { gte: from, lte: to },
    },
    include: {
      account: true,
      category: true,
    },
    orderBy: { date: "asc" },
  });

  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const byCategoryMap = new Map<
    string,
    { name: string; color: string; type: string; amount: number }
  >();

  for (const t of transactions) {
    const key = t.categoryId ?? `none-${t.type}`;
    const current = byCategoryMap.get(key) || {
      name: t.category?.name ?? "Sem categoria",
      color: t.category?.color ?? "#64748B",
      type: t.type,
      amount: 0,
    };
    current.amount += t.amount;
    byCategoryMap.set(key, current);
  }

  const byCategory = Array.from(byCategoryMap.values()).sort(
    (a, b) => b.amount - a.amount
  );

  if (formatType === "csv") {
    const lines = [
      "data;tipo;descricao;categoria;conta;valor",
      ...transactions.map((t) =>
        [
          format(t.date, "yyyy-MM-dd"),
          t.type === "income" ? "receita" : "despesa",
          `"${t.description.replace(/"/g, '""')}"`,
          t.category?.name ?? "",
          t.account.name,
          (t.amount / 100).toFixed(2).replace(".", ","),
        ].join(";")
      ),
    ];
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fluxa-${format(from, "yyyy-MM")}.csv"`,
      },
    });
  }

  return NextResponse.json({
    month: format(from, "yyyy-MM"),
    income,
    expense,
    net: income - expense,
    byCategory,
    transactions,
  });
}
