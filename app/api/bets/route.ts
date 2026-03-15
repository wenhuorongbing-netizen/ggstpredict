import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { userId, matchId, choice, amount, comment } = await request.json();

    if (!userId || !matchId || !choice || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Bet amount must be greater than zero" },
        { status: 400 }
      );
    }

    if (choice !== "A" && choice !== "B") {
      return NextResponse.json(
        { error: "Choice must be 'A' or 'B'" },
        { status: 400 }
      );
    }

    // Use Prisma transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check user points
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.points < amount) {
        throw new Error("积分不足");
      }

      // 2. Check match status
      const match = await tx.match.findUnique({
        where: { id: matchId },
      });

      if (!match) {
        throw new Error("Match not found");
      }

      if (match.status !== "OPEN") {
        throw new Error("Match is no longer open for betting");
      }

      // 3. Dynamic Betting Logic Validation
      // Fetch global settings
      const settings = await tx.systemSetting.findMany({
        where: { key: { in: ["GROUP_STAGE_LIMIT", "KNOCKOUT_PERCENT"] } }
      });
      const groupLimitSetting = settings.find(s => s.key === "GROUP_STAGE_LIMIT")?.value;
      const knockoutPercentSetting = settings.find(s => s.key === "KNOCKOUT_PERCENT")?.value;

      const groupLimit = groupLimitSetting ? parseInt(groupLimitSetting, 10) : 300;
      const knockoutPercent = knockoutPercentSetting ? parseInt(knockoutPercentSetting, 10) : 50;

      if (match.stageType === "GROUP") {
        if (amount > groupLimit) {
            throw new Error(`小组赛阶段最大下注额为 ${groupLimit}`);
        }
      } else if (match.stageType === "BRACKET") {
        const knockoutMax = Math.max(200, Math.floor(user.points * (knockoutPercent / 100)));
        if (amount > knockoutMax) {
            throw new Error(`淘汰赛阶段您的最大下注额为 ${knockoutMax}`);
        }
      } else {
        // Fallback max limit if no stageType or unknown
        if (amount > 500) {
            throw new Error("最大下注额为 500");
        }
      }

      // 4. Deduct points
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { points: { decrement: amount } },
      });

      // 5. Create Bet
      const bet = await tx.bet.create({
        data: {
          userId,
          matchId,
          amount,
          choice,
          comment,
        },
      });

      return { bet, updatedUser };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const error = err as any;
    console.error("Betting error:", error);
    // Determine if it's a known error from our transaction
    if (
      error.message === "User not found" ||
      error.message === "积分不足" ||
      error.message === "Match not found" ||
      error.message === "Match is no longer open for betting" ||
      error.message.includes("最大下注额")
    ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
