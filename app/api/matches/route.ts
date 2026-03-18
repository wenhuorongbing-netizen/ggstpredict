import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCanonicalMaps, normalizeMatchEntry } from "@/lib/tournament-data";
import { synchronizeCanonicalMatchData } from "@/lib/match-data-maintenance";

export async function GET(request: Request) {
  try {
    await synchronizeCanonicalMatchData(prisma);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const whereClause = status ? { status } : {};

    const matches = await prisma.match.findMany({
      where: whereClause,
      include: {
        bets: {
          include: {
            user: { select: { username: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enrichedMatches = matches.map((match) => {
      const userPoolA = match.bets.filter(b => b.choice === 'A').reduce((acc, b) => acc + b.amount, 0);
      const userPoolB = match.bets.filter(b => b.choice === 'B').reduce((acc, b) => acc + b.amount, 0);
      return {
        ...match,
        poolA: userPoolA + (match.poolInjectA || 0),
        poolB: userPoolB + (match.poolInjectB || 0),
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
    const { playerA, playerB, charA, charB, stageType, groupName } = await request.json();

    if (!playerA || !playerB) {
      return NextResponse.json(
        { error: "Player A and Player B are required" },
        { status: 400 }
      );
    }

    const existingMatches = await prisma.match.findMany({
      select: {
        playerA: true,
        playerB: true,
        charA: true,
        charB: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    const { playerMap, characterMap } = buildCanonicalMaps(existingMatches);
    const normalizedMatch = normalizeMatchEntry(
      { playerA, playerB, charA, charB },
      playerMap,
      characterMap,
    );

    const match = await prisma.match.create({
      data: {
        playerA: normalizedMatch.playerA,
        playerB: normalizedMatch.playerB,
        charA: normalizedMatch.charA,
        charB: normalizedMatch.charB,
        stageType: stageType || "MATCH",
        groupName: stageType === "GROUP" ? groupName : null,
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
