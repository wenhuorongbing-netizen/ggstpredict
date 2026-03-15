import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

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