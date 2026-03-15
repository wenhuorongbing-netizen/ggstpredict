import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { matchId, winner, scoreA, scoreB } = await request.json();

    if (!matchId || !winner || (winner !== "A" && winner !== "B")) {
      return NextResponse.json(
        { error: "Valid matchId and winner ('A' or 'B') are required" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get the match and its bets
      const match = await tx.match.findUnique({
        where: { id: matchId },
        include: { bets: true },
      });

      if (!match) {
        throw new Error("Match not found");
      }

      if (match.status === "SETTLED") {
        throw new Error("Match is already settled");
      }

      // 2. Calculate pools
      let userPoolA = 0;
      let userPoolB = 0;
      match.bets.forEach((bet) => {
        if (bet.choice === "A") userPoolA += bet.amount;
        if (bet.choice === "B") userPoolB += bet.amount;
      });

      // Total pools include injections
      const poolA = userPoolA + (match.poolInjectA || 0);
      const poolB = userPoolB + (match.poolInjectB || 0);

      const winningPool = winner === "A" ? poolA : poolB;
      let losingPool = winner === "A" ? poolB : poolA;
      const userWinningPool = winner === "A" ? userPoolA : userPoolB;
      const loserChoice = winner === "A" ? "B" : "A";

      // Process losers: Reset winStreak
      const losingBets = match.bets.filter((bet) => bet.choice === loserChoice);
      for (const bet of losingBets) {
        await tx.user.update({
          where: { id: bet.userId },
          data: { winStreak: 0 },
        });
      }

      // Check Counter Hit condition
      if (losingPool > 0 && winningPool > 0) {
        if (losingPool >= winningPool * 9) {
          losingPool += 2000;
        }
      }

      // 3. Distribute rewards to winners
      if (userWinningPool > 0 && losingPool > 0) {
        const winningBets = match.bets.filter((bet) => bet.choice === winner);
        for (const bet of winningBets) {
          const their_share = bet.amount / userWinningPool;
          const profit = their_share * losingPool;

          // Increment streak and get new streak length
          const user = await tx.user.update({
            where: { id: bet.userId },
            data: { winStreak: { increment: 1 } },
            select: { winStreak: true }
          });

          // Combo bonus based on NEW win streak
          let combo_bonus = 0;
          if (user.winStreak >= 5) {
            combo_bonus = profit * 0.15;
          } else if (user.winStreak >= 2) {
            combo_bonus = profit * 0.05;
          }

          const tax = Math.floor(profit * 0.05);
          const final_payout = Math.floor(bet.amount + profit + combo_bonus - tax);

          await tx.user.update({
            where: { id: bet.userId },
            data: { points: { increment: final_payout } },
          });
        }
      } else if (userWinningPool > 0 && losingPool === 0) {
        // If there is no losing pool, just return the original bet amount and increment win streak
        const winningBets = match.bets.filter((bet) => bet.choice === winner);
        for (const bet of winningBets) {
            await tx.user.update({
                where: { id: bet.userId },
                data: {
                  points: { increment: bet.amount },
                  winStreak: { increment: 1 }
                }
            });
        }
      } else if (userWinningPool === 0 && losingPool > 0) {
        // House keeps the losing pool. We do nothing for user points here.
      }

      // 4. Update match status
      const updateData: any = {
        status: "SETTLED",
        winner: winner,
      };
      if (typeof scoreA === 'number' && typeof scoreB === 'number') {
        updateData.scoreA = scoreA;
        updateData.scoreB = scoreB;
      }

      const updatedMatch = await tx.match.update({
        where: { id: matchId },
        data: updateData,
      });

      return updatedMatch;
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const error = err as any;
    console.error("Settlement error:", error);
    if (error.message === "Match not found" || error.message === "Match is already settled") {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred during settlement" },
      { status: 500 }
    );
  }
}
