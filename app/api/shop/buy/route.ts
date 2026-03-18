import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { item, targetPlayer, text } = await req.json();
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
      "ITEM_HEX": 1500,
      "ITEM_MEGAPHONE": 100,
    };

    const costNum = SHOP_PRICES[item];

    if (costNum === undefined || costNum <= 0) {
      return NextResponse.json({ error: "Invalid item or price" }, { status: 400 });
    }

    if (item === "ITEM_HEX" && !targetPlayer) {
      return NextResponse.json({ error: "Missing targetPlayer for ITEM_HEX" }, { status: 400 });
    }

    if (item === "ITEM_MEGAPHONE" && !text) {
      return NextResponse.json({ error: "Missing text for ITEM_MEGAPHONE" }, { status: 400 });
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
      } else if (item === "ITEM_HEX") {
        purchaseStatus = "FULFILLED";

        const setting = await tx.systemSetting.findUnique({
          where: { key: "HEXED_PLAYERS" }
        });

        const currentHexed = setting ? setting.value.split(',').filter(Boolean) : [];
        const cleanTarget = targetPlayer.trim();

        // Only append if not already hexed (case-insensitive check)
        if (!currentHexed.some(p => p.toLowerCase() === cleanTarget.toLowerCase())) {
           currentHexed.push(cleanTarget);
           const newHexedStr = currentHexed.join(',');
           await tx.systemSetting.upsert({
             where: { key: "HEXED_PLAYERS" },
             create: { key: "HEXED_PLAYERS", value: newHexedStr },
             update: { value: newHexedStr }
           });
        }
      } else if (item === "ITEM_MEGAPHONE") {
        purchaseStatus = "FULFILLED";

        const setting = await tx.systemSetting.findUnique({
          where: { key: "MEGAPHONE_MESSAGES" }
        });

        let messages: any[] = [];
        if (setting && setting.value) {
          try {
            messages = JSON.parse(setting.value);
            if (!Array.isArray(messages)) messages = [];
          } catch(e) {
            messages = [];
          }
        }

        messages.push({
          text: text.substring(0, 50),
          expiresAt: Date.now() + 120 * 60 * 1000,
          author: user.displayName || user.username
        });

        const newMessagesStr = JSON.stringify(messages);

        await tx.systemSetting.upsert({
          where: { key: "MEGAPHONE_MESSAGES" },
          create: { key: "MEGAPHONE_MESSAGES", value: newMessagesStr },
          update: { value: newMessagesStr }
        });
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: updateData,
      });

      let finalItemName = item;
      if (item === "ITEM_HEX") finalItemName = `ITEM_HEX (${targetPlayer})`;
      if (item === "ITEM_MEGAPHONE") finalItemName = `ITEM_MEGAPHONE (${text.substring(0, 20)}...)`;

      const purchase = await tx.purchase.create({
        data: {
          userId,
          item: finalItemName,
          cost: costNum,
          status: purchaseStatus,
        },
      });

      const friendlyName = item.includes("金色") ? "金色传说ID" :
                           item === "ITEM_FD" ? "FD气盾" :
                           item === "ITEM_FATAL" ? "打康标记" :
                           item === "ITEM_HEX" ? "罗比印记" :
                           item === "ITEM_MEGAPHONE" ? "高频扩音器" : item;

      await tx.actionLog.create({
        data: {
          actionType: "SHOP",
          userId: user.id,
          details: `花费 ${costNum} W$ 购买了 ${friendlyName}`
        }
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