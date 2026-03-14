import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { matchId, winner } = await request.json();

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
      let poolA = 0;
      let poolB = 0;
      match.bets.forEach((bet) => {
        if (bet.choice === "A") poolA += bet.amount;
        if (bet.choice === "B") poolB += bet.amount;
      });

      const winningPool = winner === "A" ? poolA : poolB;
      const losingPool = winner === "A" ? poolB : poolA;

      // 3. Distribute rewards to winners
      if (winningPool > 0 && losingPool > 0) {
        const winningBets = match.bets.filter((bet) => bet.choice === winner);
        for (const bet of winningBets) {
          const ratio = bet.amount / winningPool;
          const reward = Math.floor(losingPool * ratio);
          const totalReturn = bet.amount + reward;

          await tx.user.update({
            where: { id: bet.userId },
            data: { points: { increment: totalReturn } },
          });
        }
      } else if (winningPool > 0 && losingPool === 0) {
        // If there is no losing pool, just return the original bet amount
        const winningBets = match.bets.filter((bet) => bet.choice === winner);
        for (const bet of winningBets) {
            await tx.user.update({
                where: { id: bet.userId },
                data: { points: { increment: bet.amount } }
            });
        }
      } else if (winningPool === 0 && losingPool > 0) {
        // If there is no winning pool, the house keeps the losing pool (or you can refund, but pari-mutuel usually keeps it if no winners)
        // We do nothing for user points here.
      }

      // 4. Update match status
      const updatedMatch = await tx.match.update({
        where: { id: matchId },
        data: {
          status: "SETTLED",
          winner: winner,
        },
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
