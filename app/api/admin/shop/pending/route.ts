import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const purchases = await prisma.purchase.findMany({
      where: { status: "PENDING" },
      include: {
        user: { select: { displayName: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(purchases, { status: 200 });
  } catch (error: any) {
    console.error("Fetch Pending Purchases Error:", error);
    return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 });
  }
}