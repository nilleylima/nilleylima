import { NextResponse } from "next/server";
import { getSession, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const categories = await prisma.category.findMany({
    where: { userId: session.id },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ categories });
}
