import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getFatalCounterBonus,
  shouldPreserveStreakOnLoss,
  validateSettledScore,
} from "@/lib/bet-effects";
import {
  parseMatchRef,
  resolveBracketPlaceholderParticipant,
} from "@/lib/awt-korea-bracket";

function buildParticipantSlotUpdate(
  targetMatch: { playerA: string; playerB: string },
  ref: ReturnType<typeof parseMatchRef>,
  participant: { name: string; charName: string | null },
) {
  const targetSlot =
    ref?.slot ?? (!targetMatch.playerA || targetMatch.playerA.includes("待定") ? "A" : "B");

  if (targetSlot === "B") {
    return {
      playerB: participant.name,
      charB: participant.charName,
    };
  }

  return {
    playerA: participant.name,
    charA: participant.charName,
  };
}

export async function POST(request: Request) {
  try {
    const { matchId, winner, scoreA, scoreB } = await request.json();

    if (!matchId || (winner !== "A" && winner !== "B")) {
      return NextResponse.json({ error: "必须提供有效的对局和胜者" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: matchId },
        include: { bets: true },
      });

      if (!match) {
        throw new Error("对局不存在");
      }

      if (match.status === "SETTLED") {
        throw new Error("该对局已经结算");
      }

      const tournamentMatches = match.tournamentId
        ? await tx.match.findMany({
            where: { tournamentId: match.tournamentId },
            orderBy: { createdAt: "asc" },
          })
        : [match];

      const resolvedA = resolveBracketPlaceholderParticipant(match.playerA, tournamentMatches);
      const resolvedB = resolveBracketPlaceholderParticipant(match.playerB, tournamentMatches);
      const participantA = {
        name: resolvedA.name,
        charName: match.charA ?? resolvedA.charName,
      };
      const participantB = {
        name: resolvedB.name,
        charName: match.charB ?? resolvedB.charName,
      };
      const winnerParticipant = winner === "A" ? participantA : participantB;
      const loserParticipant = winner === "A" ? participantB : participantA;

      const fatalWinningBets = match.bets.filter((bet) => bet.choice === winner && bet.usedFatalCounter);
      const shouldValidateScore =
        fatalWinningBets.length > 0 ||
        Number.isInteger(scoreA) ||
        Number.isInteger(scoreB);

      if (shouldValidateScore) {
        const scoreValidation = validateSettledScore(winner, scoreA, scoreB);
        if (scoreValidation) {
          throw new Error(scoreValidation);
        }
      }

      let userPoolA = 0;
      let userPoolB = 0;
      match.bets.forEach((bet) => {
        if (bet.choice === "A") userPoolA += bet.amount;
        if (bet.choice === "B") userPoolB += bet.amount;
      });

      const poolA = userPoolA + (match.poolInjectA || 0);
      const poolB = userPoolB + (match.poolInjectB || 0);
      const winningPool = winner === "A" ? poolA : poolB;
      let losingPool = winner === "A" ? poolB : poolA;
      const userWinningPool = winner === "A" ? userPoolA : userPoolB;
      const loserChoice = winner === "A" ? "B" : "A";
      const taxRate = 0.05;

      const losingBets = match.bets.filter((bet) => bet.choice === loserChoice);
      for (const bet of losingBets) {
        if (shouldPreserveStreakOnLoss(bet.usedFdShield)) {
          continue;
        }

        await tx.user.update({
          where: { id: bet.userId },
          data: { winStreak: 0 },
        });
      }

      if (losingPool > 0 && winningPool > 0 && losingPool >= winningPool * 9) {
        losingPool += 2000;
      }

      if (userWinningPool > 0 && losingPool > 0) {
        const winningBets = match.bets.filter((bet) => bet.choice === winner);
        for (const bet of winningBets) {
          const share = bet.amount / userWinningPool;
          const profit = share * losingPool;

          const streakUser = await tx.user.update({
            where: { id: bet.userId },
            data: { winStreak: { increment: 1 } },
            select: { winStreak: true },
          });

          let comboBonus = 0;
          if (streakUser.winStreak >= 5) {
            comboBonus = profit * 0.15;
          } else if (streakUser.winStreak >= 2) {
            comboBonus = profit * 0.05;
          }

          const fatalBonus = getFatalCounterBonus({
            choice: bet.choice as "A" | "B",
            usedFatalCounter: bet.usedFatalCounter,
            predictedScoreA: bet.predictedScoreA,
            predictedScoreB: bet.predictedScoreB,
            winner,
            scoreA,
            scoreB,
            profit,
          });

          const tax = Math.floor(profit * taxRate);
          const finalPayout = Math.floor(bet.amount + profit + comboBonus + fatalBonus - tax);

          await tx.user.update({
            where: { id: bet.userId },
            data: { points: { increment: finalPayout } },
          });
        }
      } else if (userWinningPool > 0 && losingPool === 0) {
        const winningBets = match.bets.filter((bet) => bet.choice === winner);
        for (const bet of winningBets) {
          await tx.user.update({
            where: { id: bet.userId },
            data: {
              points: { increment: bet.amount },
              winStreak: { increment: 1 },
            },
          });
        }
      }

      const updatedMatch = await tx.match.update({
        where: { id: matchId },
        data: {
          status: "SETTLED",
          winner,
          scoreA: typeof scoreA === "number" ? scoreA : null,
          scoreB: typeof scoreB === "number" ? scoreB : null,
        },
      });

      const nextWinnerRef = parseMatchRef(match.nextWinnerMatchId);
      if (nextWinnerRef?.matchId) {
        const targetMatch = await tx.match.findUnique({
          where: { id: nextWinnerRef.matchId },
          select: { id: true, playerA: true, playerB: true },
        });

        if (targetMatch) {
          await tx.match.update({
            where: { id: targetMatch.id },
            data: buildParticipantSlotUpdate(targetMatch, nextWinnerRef, winnerParticipant),
          });
        }
      }

      const nextLoserRef = parseMatchRef(match.nextLoserMatchId);
      if (nextLoserRef?.matchId) {
        const targetMatch = await tx.match.findUnique({
          where: { id: nextLoserRef.matchId },
          select: { id: true, playerA: true, playerB: true },
        });

        if (targetMatch) {
          await tx.match.update({
            where: { id: targetMatch.id },
            data: buildParticipantSlotUpdate(targetMatch, nextLoserRef, loserParticipant),
          });
        }
      }

      if (
        (match.roundName === "Grand Final" || match.roundName === "Grand Finals" || match.roundName === "GF") &&
        winner === "B"
      ) {
        const existingReset = await tx.match.findFirst({
          where: {
            tournamentId: match.tournamentId,
            roundName: "Grand Final Reset",
            playerA: participantA.name,
            playerB: participantB.name,
          },
        });

        if (!existingReset) {
          await tx.match.create({
            data: {
              playerA: participantA.name,
              playerB: participantB.name,
              charA: participantA.charName,
              charB: participantB.charName,
              status: "LOCKED",
              tournamentId: match.tournamentId,
              stageType: match.stageType,
              groupId: match.groupId,
              roundName: "Grand Final Reset",
            },
          });
        }
      }

      await tx.adminLog.create({
        data: {
          action: "Settle Match",
          details: `Match ${matchId} settled. Winner: ${winner}${typeof scoreA === "number" && typeof scoreB === "number" ? ` (${scoreA}-${scoreB})` : ""}`,
        },
      });

      return updatedMatch;
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "结算失败";
    console.error("Settlement error:", error);

    if (
      message === "对局不存在" ||
      message === "该对局已经结算" ||
      message === "本场存在比分相关结算，必须填写有效小分" ||
      message === "胜者为 A 时，比分必须是 A 方领先" ||
      message === "胜者为 B 时，比分必须是 B 方领先"
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
