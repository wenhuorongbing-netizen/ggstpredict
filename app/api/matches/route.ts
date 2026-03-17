import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
<<<<<<< Updated upstream
=======
import { buildCanonicalMaps, normalizeMatchEntry } from "@/lib/tournament-data";
import { synchronizeCanonicalMatchData } from "@/lib/match-data-maintenance";
import { isMatchBettingClosed, parseBettingCloseDate } from "@/lib/match-betting";
import { resolveBracketDisplayMatches } from "@/lib/awt-korea-bracket";
>>>>>>> Stashed changes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const whereClause = status ? { status } : {};

    const matches = await prisma.match.findMany({
      where: whereClause,
      include: {
        bets: {
          include: {
            user: { select: { username: true, displayName: true, nameColor: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const resolvedMatches = resolveBracketDisplayMatches(matches);
    const enrichedMatches = resolvedMatches.map((match) => {
      const userPoolA = match.bets.filter(b => b.choice === 'A').reduce((acc, b) => acc + b.amount, 0);
      const userPoolB = match.bets.filter(b => b.choice === 'B').reduce((acc, b) => acc + b.amount, 0);
      return {
        ...match,
        poolA: userPoolA + (match.poolInjectA || 0),
        poolB: userPoolB + (match.poolInjectB || 0),
        bettingClosed: isMatchBettingClosed(match),
      };
    });

    return NextResponse.json(enrichedMatches);
  } catch (error) {
    console.error("Failed to fetch matches:", error);
    return NextResponse.json(
      { error: "Failed to fetch matches" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
<<<<<<< Updated upstream
    const { playerA, playerB } = await request.json();
=======
    const { playerA, playerB, charA, charB, bettingClosesAt } = await request.json();
>>>>>>> Stashed changes

    if (!playerA || !playerB) {
      return NextResponse.json(
        { error: "Player A and Player B are required" },
        { status: 400 }
      );
    }

    const match = await prisma.match.create({
      data: {
<<<<<<< Updated upstream
        playerA,
        playerB,
=======
        playerA: normalizedMatch.playerA,
        playerB: normalizedMatch.playerB,
        charA: normalizedMatch.charA,
        charB: normalizedMatch.charB,
        bettingClosesAt: parseBettingCloseDate(bettingClosesAt),
>>>>>>> Stashed changes
      },
    });

    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    console.error("Failed to create match:", error);
    return NextResponse.json(
      { error: "Failed to create match" },
      { status: 500 }
    );
  }
}
