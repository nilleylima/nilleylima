import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const defaultExpense = [
  { name: "Moradia", color: "#0F766E" },
  { name: "Alimentação", color: "#CA8A04" },
  { name: "Transporte", color: "#0369A1" },
  { name: "Saúde", color: "#BE123C" },
  { name: "Lazer", color: "#7C3AED" },
  { name: "Serviços", color: "#57534E" },
  { name: "Outros", color: "#64748B" },
];

const defaultIncome = [
  { name: "Salário", color: "#15803D" },
  { name: "Freelance", color: "#0F766E" },
  { name: "Investimentos", color: "#A16207" },
  { name: "Outros", color: "#64748B" },
];

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.toLowerCase().trim();

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email,
        passwordHash,
        categories: {
          create: [
            ...defaultExpense.map((c) => ({ ...c, type: "expense" })),
            ...defaultIncome.map((c) => ({ ...c, type: "income" })),
          ],
        },
        accounts: {
          create: {
            name: "Conta principal",
            type: "checking",
            balance: 0,
            color: "#0F766E",
          },
        },
      },
    });

    const token = await createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Erro ao registrar" }, { status: 500 });
  }
}
