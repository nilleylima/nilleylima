import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfDay } from "date-fns";

async function refreshOverdue(userId: string) {
  const today = startOfDay(new Date());
  await prisma.bill.updateMany({
    where: {
      userId,
      status: "open",
      dueDate: { lt: today },
    },
    data: { status: "overdue" },
  });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  await refreshOverdue(session.id);

  const type = req.nextUrl.searchParams.get("type");
  const status = req.nextUrl.searchParams.get("status");

  const where: { userId: string; type?: string; status?: string } = {
    userId: session.id,
  };
  if (type === "payable" || type === "receivable") where.type = type;
  if (status === "open" || status === "paid" || status === "overdue") {
    where.status = status;
  }

  const bills = await prisma.bill.findMany({
    where,
    include: {
      account: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
    },
    orderBy: [{ dueDate: "asc" }],
  });

  return NextResponse.json({ bills });
}

const createSchema = z.object({
  type: z.enum(["payable", "receivable"]),
  amount: z.number().int().positive(),
  description: z.string().min(1),
  dueDate: z.string().min(1),
  accountId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const body = createSchema.parse(await req.json());
    const bill = await prisma.bill.create({
      data: {
        userId: session.id,
        type: body.type,
        amount: body.amount,
        description: body.description,
        dueDate: new Date(body.dueDate),
        accountId: body.accountId || null,
        categoryId: body.categoryId || null,
        status: "open",
      },
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    });
    return NextResponse.json({ bill }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
