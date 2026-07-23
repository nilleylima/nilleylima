import { NextRequest, NextResponse } from "next/server";
import {
  eachMonthOfInterval,
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { getSession, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const now = new Date();
  const monthParam = req.nextUrl.searchParams.get("month");
  let year = now.getFullYear();
  let month = now.getMonth();
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    year = y;
    month = m - 1;
  }

  const monthStart = startOfMonth(new Date(year, month, 1));
  const monthEnd = endOfMonth(monthStart);

  const [accounts, monthTx, upcomingBills, categoryAgg] = await Promise.all([
    prisma.account.findMany({ where: { userId: session.id } }),
    prisma.transaction.findMany({
      where: {
        userId: session.id,
        date: { gte: monthStart, lte: monthEnd },
      },
    }),
    prisma.bill.findMany({
      where: {
        userId: session.id,
        status: { in: ["open", "overdue"] },
      },
      orderBy: { dueDate: "asc" },
      take: 6,
      include: {
        category: { select: { name: true, color: true } },
      },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId", "type"],
      where: {
        userId: session.id,
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
  ]);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const income = monthTx
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expense = monthTx
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const categories = await prisma.category.findMany({
    where: { userId: session.id },
  });
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const byCategory = categoryAgg
    .filter((row) => row.type === "expense" && row.categoryId)
    .map((row) => ({
      categoryId: row.categoryId!,
      name: catMap.get(row.categoryId!)?.name ?? "Sem categoria",
      color: catMap.get(row.categoryId!)?.color ?? "#64748B",
      amount: row._sum.amount ?? 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const rangeStart = startOfMonth(subMonths(monthStart, 5));
  const months = eachMonthOfInterval({ start: rangeStart, end: monthStart });
  const historyTx = await prisma.transaction.findMany({
    where: {
      userId: session.id,
      date: { gte: rangeStart, lte: monthEnd },
    },
  });

  const cashflow = months.map((m) => {
    const key = format(m, "yyyy-MM");
    const inMonth = historyTx.filter((t) => format(t.date, "yyyy-MM") === key);
    return {
      month: key,
      label: format(m, "MMM", { locale: ptBR }),
      income: inMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
      expense: inMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    };
  });

  return NextResponse.json({
    totalBalance,
    income,
    expense,
    net: income - expense,
    accounts,
    byCategory,
    cashflow,
    upcomingBills,
    month: format(monthStart, "yyyy-MM"),
  });
}
