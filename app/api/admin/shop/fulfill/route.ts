import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    const { purchaseId } = await req.json();

    if (!purchaseId) {
      return NextResponse.json({ error: "Missing purchaseId" }, { status: 400 });
    }

    const purchase = await prisma.purchase.update({
      where: { id: purchaseId },
      data: { status: "FULFILLED" },
    });

    return NextResponse.json({ success: true, purchase }, { status: 200 });
  } catch (error: any) {
    console.error("Fulfill Error:", error);
    return NextResponse.json({ error: "Failed to fulfill purchase" }, { status: 500 });
  }
}