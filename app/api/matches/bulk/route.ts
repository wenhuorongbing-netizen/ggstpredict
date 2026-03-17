import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
<<<<<<< Updated upstream
=======
import { synchronizeCanonicalMatchData } from "@/lib/match-data-maintenance";
import { buildCanonicalMaps, normalizeMatchEntry } from "@/lib/tournament-data";
import { parseBettingCloseDate } from "@/lib/match-betting";
>>>>>>> Stashed changes

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { matches, stageType, groupId, tournamentId, bettingClosesAt } = body;
    const parsedBettingClosesAt = parseBettingCloseDate(bettingClosesAt);

    if (!Array.isArray(matches) || matches.length === 0) {
      return NextResponse.json(
        { error: "无效的数据格式 (Invalid data format)" },
        { status: 400 }
      );
    }

    let activeTournamentId = tournamentId;

    if (!activeTournamentId) {
      // Auto-create or fetch active tournament
      let tournament = await prisma.tournament.findFirst({
        orderBy: { createdAt: 'desc' }
      });

      if (!tournament) {
        tournament = await prisma.tournament.create({
          data: { name: "AWT Finals (Default)", status: "GROUP_STAGE" }
        });
      }
      activeTournamentId = tournament.id;
    }

    const formattedMatches = matches.map((m) => {
      if (!m.playerA || !m.playerB) {
        throw new Error("每场对决都必须包含 Player A 和 Player B");
      }
      return {
        playerA: m.playerA.trim(),
        playerB: m.playerB.trim(),
        charA: m.charA ? m.charA.trim() : null,
        charB: m.charB ? m.charB.trim() : null,
        status: "LOCKED",
        tournamentId: activeTournamentId,
        stageType: stageType || "GROUP",
        groupId: groupId || "A",
        bettingClosesAt: parsedBettingClosesAt,
      };
    });

    // SQLite driver for Prisma does not support createMany. We use a transaction instead.
    const result = await prisma.$transaction(
      formattedMatches.map((match) => prisma.match.create({ data: match }))
    );

    return NextResponse.json({ count: result.length }, { status: 201 });
  } catch (err: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const error = err as any;
    console.error("Failed to bulk create matches:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create matches" },
      { status: 500 }
    );
  }
}
