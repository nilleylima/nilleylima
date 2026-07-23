import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;

  const existing = await prisma.transaction.findFirst({
    where: { id, userId: session.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });
  }

  const reverse = existing.type === "income" ? -existing.amount : existing.amount;

  await prisma.$transaction(async (tx) => {
    await tx.account.update({
      where: { id: existing.accountId },
      data: { balance: { increment: reverse } },
    });
    await tx.transaction.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;

  const schema = z.object({
    description: z.string().min(1).optional(),
    categoryId: z.string().nullable().optional(),
    date: z.string().optional(),
  });

  try {
    const body = schema.parse(await req.json());
    const existing = await prisma.transaction.findFirst({
      where: { id, userId: session.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        description: body.description,
        categoryId: body.categoryId === undefined ? undefined : body.categoryId,
        date: body.date ? new Date(body.date) : undefined,
      },
      include: {
        account: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    });

    return NextResponse.json({ transaction });
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
