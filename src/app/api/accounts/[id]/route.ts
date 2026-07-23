import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;

  const schema = z.object({
    name: z.string().min(2).optional(),
    type: z.enum(["checking", "savings", "credit", "cash", "digital"]).optional(),
    color: z.string().optional(),
  });

  try {
    const body = schema.parse(await req.json());
    const existing = await prisma.account.findFirst({
      where: { id, userId: session.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    }

    const account = await prisma.account.update({
      where: { id },
      data: body,
    });
    return NextResponse.json({ account });
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;

  const existing = await prisma.account.findFirst({
    where: { id, userId: session.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
  }

  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
