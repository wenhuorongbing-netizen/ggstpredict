import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isMatchBettingClosed } from "@/lib/match-betting";

export async function POST(request: Request) {
  try {
    const { userId, matchId } = await request.json();

    if (!userId || !matchId) {
      return NextResponse.json({ error: "缺少必要字段" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: matchId },
      });

      if (!match) {
        throw new Error("对局不存在");
      }

      if (isMatchBettingClosed(match)) {
        throw new Error("该对局已封盘，无法撤回下注");
      }

      const bet = await tx.bet.findFirst({
        where: {
          userId,
          matchId,
        },
      });

      if (!bet) {
        throw new Error("未找到这笔下注");
      }

      const refund = Math.floor(bet.amount * 0.95);

      await tx.user.update({
        where: { id: userId },
        data: {
          points: { increment: refund },
          fdShields: bet.usedFdShield ? { increment: 1 } : undefined,
          fatalCounters: bet.usedFatalCounter ? { increment: 1 } : undefined,
        },
      });

      await tx.bet.delete({
        where: { id: bet.id },
      });

      return {
        refund,
        originalAmount: bet.amount,
        restoredFdShield: bet.usedFdShield,
        restoredFatalCounter: bet.usedFatalCounter,
      };
    });

    return NextResponse.json(
      {
        message: "下注已撤回",
        refund: result.refund,
        restoredFdShield: result.restoredFdShield,
        restoredFatalCounter: result.restoredFatalCounter,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "撤回下注失败";
    console.error("Cancel bet error:", error);

    if (
      message === "对局不存在" ||
      message === "未找到这笔下注" ||
      message === "该对局已封盘，无法撤回下注"
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
