import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isMatchBettingClosed } from "@/lib/match-betting";
import { validateFatalPrediction } from "@/lib/bet-effects";

export async function POST(request: Request) {
  try {
    const {
      userId,
      matchId,
      choice,
      amount,
      comment,
      useFdShield = false,
      useFatalCounter = false,
      predictedScoreA,
      predictedScoreB,
    } = await request.json();

    const amountValue = Number(amount);

    if (!userId || !matchId || !choice || !amountValue) {
      return NextResponse.json({ error: "缺少必要字段" }, { status: 400 });
    }

    if (amountValue <= 0) {
      return NextResponse.json({ error: "下注金额必须大于 0" }, { status: 400 });
    }

    if (choice !== "A" && choice !== "B") {
      return NextResponse.json({ error: "下注方向无效" }, { status: 400 });
    }

    if (useFatalCounter) {
      const fatalValidation = validateFatalPrediction({
        choice,
        predictedScoreA,
        predictedScoreB,
      });

      if (fatalValidation) {
        return NextResponse.json({ error: fatalValidation }, { status: 400 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("用户不存在");
      }

      if (user.points < amountValue) {
        throw new Error("余额不足");
      }

      if (useFdShield && user.fdShields < 1) {
        throw new Error("FD 护盾不足");
      }

      if (useFatalCounter && user.fatalCounters < 1) {
        throw new Error("致命打康数量不足");
      }

      const match = await tx.match.findUnique({
        where: { id: matchId },
      });

      if (!match) {
        throw new Error("对局不存在");
      }

      if (isMatchBettingClosed(match)) {
        throw new Error("该对局已封盘，无法继续下注");
      }

      const settings = await tx.systemSetting.findMany({
        where: { key: { in: ["GROUP_STAGE_LIMIT", "KNOCKOUT_PERCENT"] } },
      });
      const groupLimit = Number(settings.find((setting) => setting.key === "GROUP_STAGE_LIMIT")?.value ?? 300);
      const knockoutPercent = Number(settings.find((setting) => setting.key === "KNOCKOUT_PERCENT")?.value ?? 50);

      if (match.stageType === "GROUP") {
        if (amountValue > groupLimit) {
          throw new Error(`小组赛下注上限为 ${groupLimit} W$`);
        }
      } else if (match.stageType === "BRACKET") {
        const knockoutMax = Math.max(200, Math.floor(user.points * (knockoutPercent / 100)));
        if (amountValue > knockoutMax) {
          throw new Error(`淘汰赛下注上限为 ${knockoutMax} W$`);
        }
      } else if (amountValue > 500) {
        throw new Error("默认下注上限为 500 W$");
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          points: { decrement: amountValue },
          fdShields: useFdShield ? { decrement: 1 } : undefined,
          fatalCounters: useFatalCounter ? { decrement: 1 } : undefined,
        },
      });

      const bet = await tx.bet.create({
        data: {
          userId,
          matchId,
          amount: amountValue,
          choice,
          comment,
          usedFdShield: Boolean(useFdShield),
          usedFatalCounter: Boolean(useFatalCounter),
          predictedScoreA: useFatalCounter ? Number(predictedScoreA) : null,
          predictedScoreB: useFatalCounter ? Number(predictedScoreB) : null,
        },
      });

      const tensionSetting = await tx.systemSetting.findUnique({ where: { key: "GLOBAL_TENSION" } });
      const currentTension = Number(tensionSetting?.value ?? 0);
      const newTension = Math.min(currentTension + amountValue, 20000);

      await tx.systemSetting.upsert({
        where: { key: "GLOBAL_TENSION" },
        update: { value: String(newTension) },
        create: { key: "GLOBAL_TENSION", value: String(newTension) },
      });

      return { bet, updatedUser };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "下注失败";
    console.error("Betting error:", error);

    if (
      message === "用户不存在" ||
      message === "余额不足" ||
      message === "FD 护盾不足" ||
      message === "致命打康数量不足" ||
      message === "对局不存在" ||
      message === "该对局已封盘，无法继续下注" ||
      message.includes("下注上限")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
