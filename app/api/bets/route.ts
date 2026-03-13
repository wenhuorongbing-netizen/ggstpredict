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
        throw new Error("₩ 不足");
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

      // 3. Deduct points
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { points: { decrement: amount } },
      });

      // 4. Create Bet
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
  } catch (error: any) {
    console.error("Betting error:", error);
    // Determine if it's a known error from our transaction
    if (error.message === "User not found" || error.message === "₩ 不足" || error.message === "Match not found" || error.message === "Match is no longer open for betting") {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
