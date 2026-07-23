import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const accounts = await prisma.account.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ accounts });
}

const createSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["checking", "savings", "credit", "cash", "digital"]),
  balance: z.number().int().optional(),
  color: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const body = createSchema.parse(await req.json());
    const account = await prisma.account.create({
      data: {
        userId: session.id,
        name: body.name,
        type: body.type,
        balance: body.balance ?? 0,
        color: body.color ?? "#0F766E",
      },
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
