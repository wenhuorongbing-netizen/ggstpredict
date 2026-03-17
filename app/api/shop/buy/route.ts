import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { item } = await req.json();
    const userId = req.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!item) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Server-side price mapping to prevent client spoofing
    const SHOP_PRICES: Record<string, number> = {
      "金色传说ID (Gold Name)": 10000,
      "ITEM_FD": 100,
      "ITEM_FATAL": 300,
    };

    const costNum = SHOP_PRICES[item];

    if (costNum === undefined || costNum <= 0) {
      return NextResponse.json({ error: "Invalid item or price" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error("User not found");
      }
      if (user.points < costNum) {
        throw new Error("Insufficient funds (积分不足)");
      }

      const updateData: any = { points: { decrement: costNum } };

      let purchaseStatus = "PENDING";
      if (item.includes("金色传说ID")) {
        updateData.nameColor = "#fbbf24"; // Gold color
        purchaseStatus = "FULFILLED"; // Auto-fulfill this specific cosmetic
      } else if (item === "ITEM_FD") {
        updateData.fdShields = { increment: 1 };
        purchaseStatus = "FULFILLED"; // Consumables auto-fulfill instantly
      } else if (item === "ITEM_FATAL") {
        updateData.fatalCounters = { increment: 1 };
        purchaseStatus = "FULFILLED"; // Consumables auto-fulfill instantly
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: updateData,
      });

      const purchase = await tx.purchase.create({
        data: {
          userId,
          item,
          cost: costNum,
          status: purchaseStatus,
        },
      });

      return { purchase, updatedUser };
    });

    return NextResponse.json({
      success: true,
      purchase: result.purchase,
      points: result.updatedUser.points,
      fdShields: result.updatedUser.fdShields,
      fatalCounters: result.updatedUser.fatalCounters
    }, { status: 200 });
  } catch (error: any) {
    console.error("Black Market Purchase Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process purchase" },
      { status: 500 }
    );
  }
}