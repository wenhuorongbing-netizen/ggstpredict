import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  MEGAPHONE_DURATION_MINUTES,
  getShopItem,
  stringifyPurchaseDetails,
} from "@/lib/shop-catalog";

export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    const { itemId, targetPlayer, message } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const item = getShopItem(itemId);
    if (!item) {
      return NextResponse.json({ error: "无效的商品" }, { status: 400 });
    }

    const purchase = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error("用户不存在");
      }

      if (user.points < item.cost) {
        throw new Error("余额不足");
      }

      const updateData: Record<string, unknown> = {
        points: { decrement: item.cost },
      };
      const details: Record<string, string> = {};

      if (item.id === "fd_shield") {
        updateData.fdShields = { increment: 1 };
      }

      if (item.id === "fatal_counter") {
        updateData.fatalCounters = { increment: 1 };
      }

      if (item.id === "robbie_hex") {
        if (!targetPlayer || typeof targetPlayer !== "string") {
          throw new Error("请选择要贴标的选手");
        }

        const availableMatches = await tx.match.findMany({
          where: { status: { in: ["OPEN", "LOCKED"] } },
          select: { playerA: true, playerB: true },
        });
        const availablePlayers = new Set<string>();
        availableMatches.forEach((match) => {
          availablePlayers.add(match.playerA);
          availablePlayers.add(match.playerB);
        });

        if (!availablePlayers.has(targetPlayer)) {
          throw new Error("该选手不在当前赛程中");
        }

        await tx.robbieHex.create({
          data: {
            playerName: targetPlayer,
            createdById: userId,
          },
        });

        details.targetPlayer = targetPlayer;
      }

      if (item.id === "salt_megaphone") {
        const trimmedMessage = typeof message === "string" ? message.trim() : "";
        if (!trimmedMessage) {
          throw new Error("请输入扩音器内容");
        }

        if (trimmedMessage.length > 80) {
          throw new Error("扩音器内容不能超过 80 个字");
        }

        await tx.megaphoneMessage.create({
          data: {
            userId,
            message: trimmedMessage,
            expiresAt: new Date(Date.now() + MEGAPHONE_DURATION_MINUTES * 60 * 1000),
          },
        });

        details.message = trimmedMessage;
      }

      await tx.user.update({
        where: { id: userId },
        data: updateData,
      });

      return tx.purchase.create({
        data: {
          userId,
          item: item.id,
          cost: item.cost,
          details: Object.keys(details).length > 0 ? stringifyPurchaseDetails(details) : null,
          status: "FULFILLED",
        },
      });
    });

    return NextResponse.json({ success: true, purchase }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "黑市交易失败";
    console.error("Black market purchase error:", error);

    if (
      message === "用户不存在" ||
      message === "余额不足" ||
      message === "请选择要贴标的选手" ||
      message === "该选手不在当前赛程中" ||
      message === "请输入扩音器内容" ||
      message === "扩音器内容不能超过 80 个字"
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
