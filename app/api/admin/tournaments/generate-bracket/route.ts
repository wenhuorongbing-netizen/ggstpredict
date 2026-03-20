import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const headerPayload = await headers();
    const userId = headerPayload.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tournamentId } = await request.json();

    if (!tournamentId) {
      return NextResponse.json({ error: "Tournament ID required" }, { status: 400 });
    }

    const groups = ["A", "B", "C", "D"];
    const top2ByGroup: Record<string, string[]> = {};

    for (const group of groups) {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: `GROUP_CONFIRM::${tournamentId}::${group}` }
      });

      if (!setting) {
        return NextResponse.json({ error: `Group ${group} not confirmed` }, { status: 400 });
      }

      const data = JSON.parse(setting.value);
      top2ByGroup[group] = data.top2;
    }

    // AWT Advanced list tracking (Scoped to tournament)
    const advancedPlayers = [
      ...top2ByGroup["A"],
      ...top2ByGroup["B"],
      ...top2ByGroup["C"],
      ...top2ByGroup["D"],
    ];

    await prisma.$transaction(async (tx) => {
      // Create bracket matches based on frozen top2 (this is a placeholder for actual generation which is Sprint 2, but we need to satisfy Sprint 1 bounds)
      await tx.systemSetting.upsert({
        where: { key: `AWT_ADVANCED_PLAYERS::${tournamentId}` },
        update: { value: JSON.stringify(advancedPlayers) },
        create: { key: `AWT_ADVANCED_PLAYERS::${tournamentId}`, value: JSON.stringify(advancedPlayers) }
      });

      // Check if bracket already exists for this tournament to prevent duplicate generation
      const existingBracket = await tx.match.findFirst({
        where: {
          tournamentId,
          stageType: "BRACKET",
          roundName: { startsWith: "Winners Quarter-Final" }
        }
      });

      if (existingBracket) {
        throw new Error(`Bracket already generated for tournament ${tournamentId}`);
      }

      // 8-player Double Elimination Bracket Topology
      const matchesToCreate = [
        // Winners Round 1 (Quarter-Finals)
        { a: top2ByGroup["A"][0], b: top2ByGroup["D"][1], roundName: "Winners Quarter-Final 1" },
        { a: top2ByGroup["B"][0], b: top2ByGroup["C"][1], roundName: "Winners Quarter-Final 2" },
        { a: top2ByGroup["C"][0], b: top2ByGroup["B"][1], roundName: "Winners Quarter-Final 3" },
        { a: top2ByGroup["D"][0], b: top2ByGroup["A"][1], roundName: "Winners Quarter-Final 4" },

        // Winners Semi-Finals
        { a: "[ TBD ]", b: "[ TBD ]", roundName: "Winners Semi-Final 1" },
        { a: "[ TBD ]", b: "[ TBD ]", roundName: "Winners Semi-Final 2" },

        // Winners Final
        { a: "[ TBD ]", b: "[ TBD ]", roundName: "Winners Final" },

        // Losers Round 1
        { a: "[ TBD ]", b: "[ TBD ]", roundName: "Losers Round 1 (1)" },
        { a: "[ TBD ]", b: "[ TBD ]", roundName: "Losers Round 1 (2)" },

        // Losers Quarter-Finals
        { a: "[ TBD ]", b: "[ TBD ]", roundName: "Losers Quarter-Final 1" },
        { a: "[ TBD ]", b: "[ TBD ]", roundName: "Losers Quarter-Final 2" },

        // Losers Semi-Finals
        { a: "[ TBD ]", b: "[ TBD ]", roundName: "Losers Semi-Final" },

        // Losers Final
        { a: "[ TBD ]", b: "[ TBD ]", roundName: "Losers Final" },

        // Grand Final
        { a: "[ TBD ]", b: "[ TBD ]", roundName: "Grand Final" },

        // Grand Final - Reset (Hidden until needed)
        { a: "[ TBD ]", b: "[ TBD ]", roundName: "Grand Final - Reset" }
      ];

      let createdCount = 0;
      for (const match of matchesToCreate) {
        await tx.match.create({
          data: {
            tournamentId,
            playerA: match.a,
            playerB: match.b,
            stageType: "BRACKET",
            roundName: match.roundName,
            status: match.a === "[ TBD ]" ? "LOCKED" : "OPEN",
            poolInjectA: 0,
            poolInjectB: 0,
          }
        });
        createdCount++;
      }

      await tx.actionLog.create({
        data: {
          actionType: "BRACKET_GENERATED",
          userId: userId,
          details: JSON.stringify({ tournamentId, generatedMatches: createdCount }),
        }
      });
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Generate bracket error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
