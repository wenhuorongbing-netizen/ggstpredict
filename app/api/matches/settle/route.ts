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

      // 2.5 Tension and Tax logic
      const taxRate = 0.05; // Tax is always 5%. Tension is purely manual by Admin.

      // Process losers: Reset winStreak
      const losingBets = match.bets.filter((bet) => bet.choice === loserChoice);
      for (const bet of losingBets) {
        // Intercept: FD Shield prevents winStreak reset
        if (bet.usedItem === "ITEM_FD") {
          continue; // Preserve winStreak
        }

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
      const matchScoreA = typeof scoreA === 'number' ? scoreA : null;
      const matchScoreB = typeof scoreB === 'number' ? scoreB : null;
      let actualScoreString = "";
      if (matchScoreA !== null && matchScoreB !== null) {
        // Score strings are usually "WinnerScore-LoserScore" based on the user's prediction format.
        // Or "PlayerAScore-PlayerBScore". We need to check what the UI expects.
        // Assuming the UI expects "WinnerScore-LoserScore":
        if (winner === "A") {
          actualScoreString = `${matchScoreA}-${matchScoreB}`;
        } else if (winner === "B") {
          actualScoreString = `${matchScoreB}-${matchScoreA}`;
        }
      }

      if (userWinningPool > 0 && losingPool > 0) {
        const winningBets = match.bets.filter((bet) => bet.choice === winner);
        for (const bet of winningBets) {
          const their_share = bet.amount / userWinningPool;
          let profit = their_share * losingPool;

          // Intercept: Fatal Counter
          if (bet.usedItem === "ITEM_FATAL" && bet.predictedScore && actualScoreString) {
             if (bet.predictedScore === actualScoreString) {
                // Guessed correctly, multiply profit by 1.5
                profit = Math.floor(profit * 1.5);
             }
          }

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

          const tax = Math.floor(profit * taxRate);
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

// 4.6 Automatic Bracket Progression Engine
      // Forward the winner and loser to their downstream matches if linked
      const winnerName = winner === "A" ? match.playerA : match.playerB;
      const loserName = winner === "A" ? match.playerB : match.playerA;

      if (match.nextWinnerMatchId) {
        const nextWinnerMatch = await tx.match.findUnique({ where: { id: match.nextWinnerMatchId } });
        if (nextWinnerMatch) {
          // Determine which slot to fill. For simplicity, if playerA is TBD, fill it. Else fill B.
          let updateData: any = {};
          if (nextWinnerMatch.playerA === "[ TBD ]") {
            updateData.playerA = winnerName;
          } else if (nextWinnerMatch.playerB === "[ TBD ]") {
            updateData.playerB = winnerName;
          }

          if (Object.keys(updateData).length > 0) {
            // Check if this update fully populates the match
            if ((updateData.playerA || nextWinnerMatch.playerA !== "[ TBD ]") &&
                (updateData.playerB || nextWinnerMatch.playerB !== "[ TBD ]")) {
              updateData.status = "OPEN"; // Unlock it
            }
            await tx.match.update({
              where: { id: match.nextWinnerMatchId },
              data: updateData
            });
          }
        }
      }

      if (match.nextLoserMatchId) {
        const nextLoserMatch = await tx.match.findUnique({ where: { id: match.nextLoserMatchId } });
        if (nextLoserMatch) {
          let updateData: any = {};
          if (nextLoserMatch.playerA === "[ TBD ]") {
            updateData.playerA = loserName;
          } else if (nextLoserMatch.playerB === "[ TBD ]") {
            updateData.playerB = loserName;
          }

          if (Object.keys(updateData).length > 0) {
            if ((updateData.playerA || nextLoserMatch.playerA !== "[ TBD ]") &&
                (updateData.playerB || nextLoserMatch.playerB !== "[ TBD ]")) {
              updateData.status = "OPEN";
            }
            await tx.match.update({
              where: { id: match.nextLoserMatchId },
              data: updateData
            });
          }
        }
      }

      // Overwrite the Grand Final Reset logic to connect with the generated placeholder
      if (
        (match.roundName === "Grand Final" || match.roundName === "Grand Finals" || match.roundName === "GF") &&
        winner === "B"
      ) {
        const existingReset = await tx.match.findFirst({
          where: {
            tournamentId: match.tournamentId,
            roundName: "Grand Final Reset",
            playerA: "[ TBD ]",
            playerB: "[ TBD ]"
          }
        });

        if (existingReset) {
          await tx.match.update({
            where: { id: existingReset.id },
            data: {
              playerA: match.playerA,
              playerB: match.playerB,
              status: "OPEN"
            }
          });
        } else {
          // Fallback if not pre-generated
          await tx.match.create({
            data: {
              playerA: match.playerA,
              playerB: match.playerB,
              charA: match.charA,
              charB: match.charB,
              status: "OPEN",
              tournamentId: match.tournamentId,
              stageType: match.stageType,
              groupId: match.groupId,
              roundName: "Grand Final Reset",
            }
          });
        }
      } else if (match.roundName === "Grand Final" && winner === "A") {
         // If A wins, the reset is not needed. We can delete it or void it.
         const existingReset = await tx.match.findFirst({
          where: {
            tournamentId: match.tournamentId,
            roundName: "Grand Final Reset",
            playerA: "[ TBD ]",
            playerB: "[ TBD ]"
          }
        });
        if (existingReset) {
           await tx.match.delete({ where: { id: existingReset.id } });
        }
      }

      // 6. Audit Log
      await tx.adminLog.create({
        data: {
          action: "Settle Match",
          details: `Match ${matchId} settled. Winner: ${winner}`
        }
      });

      // Note: winnerName is already defined earlier for progression logic, let's redefine differently or just use it.
      const actionLogWinner = winner === "A" ? match.playerA : match.playerB;
      await tx.actionLog.create({
        data: {
          actionType: "ADMIN_SETTLE",
          details: `[赛事播报] 比赛结算！【 ${match.playerA} vs ${match.playerB} 】 的获胜者是 ${actionLogWinner}`
        }
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
