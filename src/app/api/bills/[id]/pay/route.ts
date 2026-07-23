import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;

  const schema = z.object({
    accountId: z.string().min(1),
  });

  try {
    const body = schema.parse(await req.json());
    const bill = await prisma.bill.findFirst({
      where: { id, userId: session.id },
    });
    if (!bill) {
      return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });
    }
    if (bill.status === "paid") {
      return NextResponse.json({ error: "Já está pago" }, { status: 400 });
    }

    const account = await prisma.account.findFirst({
      where: { id: body.accountId, userId: session.id },
    });
    if (!account) {
      return NextResponse.json({ error: "Conta inválida" }, { status: 400 });
    }

    const txType = bill.type === "payable" ? "expense" : "income";
    const delta = txType === "income" ? bill.amount : -bill.amount;

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId: session.id,
          accountId: body.accountId,
          categoryId: bill.categoryId,
          type: txType,
          amount: bill.amount,
          description: bill.description,
          date: new Date(),
        },
      });

      await tx.account.update({
        where: { id: body.accountId },
        data: { balance: { increment: delta } },
      });

      const updated = await tx.bill.update({
        where: { id },
        data: {
          status: "paid",
          paidAt: new Date(),
          accountId: body.accountId,
        },
        include: {
          account: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, color: true } },
        },
      });

      return { bill: updated, transaction };
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
