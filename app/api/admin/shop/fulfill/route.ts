import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
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