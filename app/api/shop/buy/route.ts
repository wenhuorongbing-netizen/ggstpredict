import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { item, cost } = await req.json();
    const userId = req.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!item || !cost) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const costNum = Number(cost);

    const purchase = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error("User not found");
      }
      if (user.points < costNum) {
        throw new Error("Insufficient funds (积分不足)");
      }

      await tx.user.update({
        where: { id: userId },
        data: { points: { decrement: costNum } },
      });

      return tx.purchase.create({
        data: {
          userId,
          item,
          cost: costNum,
          status: "PENDING",
        },
      });
    });

    return NextResponse.json({ success: true, purchase }, { status: 200 });
  } catch (error: any) {
    console.error("Black Market Purchase Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process purchase" },
      { status: 500 }
    );
  }
}