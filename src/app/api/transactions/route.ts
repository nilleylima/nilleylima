import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month"); // YYYY-MM
  const type = searchParams.get("type");

  const where: {
    userId: string;
    type?: string;
    date?: { gte: Date; lt: Date };
  } = { userId: session.id };

  if (type === "income" || type === "expense") where.type = type;

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    where.date = {
      gte: new Date(y, m - 1, 1),
      lt: new Date(y, m, 1),
    };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      account: { select: { id: true, name: true, color: true } },
      category: { select: { id: true, name: true, color: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ transactions });
}

const createSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().optional().nullable(),
  type: z.enum(["income", "expense"]),
  amount: z.number().int().positive(),
  description: z.string().min(1),
  date: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const body = createSchema.parse(await req.json());
    const account = await prisma.account.findFirst({
      where: { id: body.accountId, userId: session.id },
    });
    if (!account) {
      return NextResponse.json({ error: "Conta inválida" }, { status: 400 });
    }

    if (body.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: body.categoryId, userId: session.id },
      });
      if (!category) {
        return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });
      }
    }

    const delta = body.type === "income" ? body.amount : -body.amount;

    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          userId: session.id,
          accountId: body.accountId,
          categoryId: body.categoryId || null,
          type: body.type,
          amount: body.amount,
          description: body.description,
          date: new Date(body.date),
        },
        include: {
          account: { select: { id: true, name: true, color: true } },
          category: { select: { id: true, name: true, color: true } },
        },
      });

      await tx.account.update({
        where: { id: body.accountId },
        data: { balance: { increment: delta } },
      });

      return created;
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
