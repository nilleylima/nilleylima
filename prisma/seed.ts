import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const expenseCategories = [
  { name: "Moradia", color: "#0F766E" },
  { name: "Alimentação", color: "#CA8A04" },
  { name: "Transporte", color: "#0369A1" },
  { name: "Saúde", color: "#BE123C" },
  { name: "Lazer", color: "#7C3AED" },
  { name: "Educação", color: "#4338CA" },
  { name: "Serviços", color: "#57534E" },
  { name: "Outros", color: "#64748B" },
];

const incomeCategories = [
  { name: "Salário", color: "#15803D" },
  { name: "Freelance", color: "#0F766E" },
  { name: "Investimentos", color: "#A16207" },
  { name: "Outros", color: "#64748B" },
];

async function main() {
  const email = "demo@fluxa.app";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Usuário demo já existe:", email);
    return;
  }

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const user = await prisma.user.create({
    data: {
      name: "Demo Fluxa",
      email,
      passwordHash,
    },
  });

  await prisma.category.createMany({
    data: [
      ...expenseCategories.map((c) => ({
        ...c,
        type: "expense",
        userId: user.id,
      })),
      ...incomeCategories.map((c) => ({
        ...c,
        type: "income",
        userId: user.id,
      })),
    ],
  });

  const checking = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Conta Corrente",
      type: "checking",
      balance: 850000,
      color: "#0F766E",
    },
  });

  await prisma.account.create({
    data: {
      userId: user.id,
      name: "Carteira",
      type: "cash",
      balance: 35000,
      color: "#A16207",
    },
  });

  const categories = await prisma.category.findMany({ where: { userId: user.id } });
  const salary = categories.find((c) => c.name === "Salário")!;
  const food = categories.find((c) => c.name === "Alimentação")!;
  const housing = categories.find((c) => c.name === "Moradia")!;
  const transport = categories.find((c) => c.name === "Transporte")!;

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        accountId: checking.id,
        categoryId: salary.id,
        type: "income",
        amount: 650000,
        description: "Salário mensal",
        date: new Date(year, month, 5),
      },
      {
        userId: user.id,
        accountId: checking.id,
        categoryId: housing.id,
        type: "expense",
        amount: 180000,
        description: "Aluguel",
        date: new Date(year, month, 8),
      },
      {
        userId: user.id,
        accountId: checking.id,
        categoryId: food.id,
        type: "expense",
        amount: 42000,
        description: "Mercado semanal",
        date: new Date(year, month, 12),
      },
      {
        userId: user.id,
        accountId: checking.id,
        categoryId: transport.id,
        type: "expense",
        amount: 18000,
        description: "Combustível",
        date: new Date(year, month, 15),
      },
    ],
  });

  await prisma.bill.createMany({
    data: [
      {
        userId: user.id,
        accountId: checking.id,
        categoryId: housing.id,
        type: "payable",
        amount: 180000,
        description: "Aluguel próximo mês",
        dueDate: new Date(year, month + 1, 8),
        status: "open",
      },
      {
        userId: user.id,
        type: "receivable",
        amount: 120000,
        description: "Freelance cliente X",
        dueDate: new Date(year, month, 28),
        status: "open",
      },
    ],
  });

  console.log("Seed OK — login: demo@fluxa.app / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
