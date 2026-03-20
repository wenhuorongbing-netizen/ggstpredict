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
        { id: "W_QF_1", a: top2ByGroup["A"][0], b: top2ByGroup["D"][1], roundName: "Winners Quarter-Final 1" },
        { id: "W_QF_2", a: top2ByGroup["B"][0], b: top2ByGroup["C"][1], roundName: "Winners Quarter-Final 2" },
        { id: "W_QF_3", a: top2ByGroup["C"][0], b: top2ByGroup["B"][1], roundName: "Winners Quarter-Final 3" },
        { id: "W_QF_4", a: top2ByGroup["D"][0], b: top2ByGroup["A"][1], roundName: "Winners Quarter-Final 4" },

        // Winners Semi-Finals
        { id: "W_SF_1", a: "[ TBD ]", b: "[ TBD ]", roundName: "Winners Semi-Final 1" },
        { id: "W_SF_2", a: "[ TBD ]", b: "[ TBD ]", roundName: "Winners Semi-Final 2" },

        // Winners Final
        { id: "W_F", a: "[ TBD ]", b: "[ TBD ]", roundName: "Winners Final" },

        // Losers Round 1
        { id: "L_R1_1", a: "[ TBD ]", b: "[ TBD ]", roundName: "Losers Round 1 (1)" },
        { id: "L_R1_2", a: "[ TBD ]", b: "[ TBD ]", roundName: "Losers Round 1 (2)" },

        // Losers Quarter-Finals
        { id: "L_QF_1", a: "[ TBD ]", b: "[ TBD ]", roundName: "Losers Quarter-Final 1" },
        { id: "L_QF_2", a: "[ TBD ]", b: "[ TBD ]", roundName: "Losers Quarter-Final 2" },

        // Losers Semi-Finals
        { id: "L_SF", a: "[ TBD ]", b: "[ TBD ]", roundName: "Losers Semi-Final" },

        // Losers Final
        { id: "L_F", a: "[ TBD ]", b: "[ TBD ]", roundName: "Losers Final" },

        // Grand Final
        { id: "GF", a: "[ TBD ]", b: "[ TBD ]", roundName: "Grand Final" },

        // Grand Final Reset (Hidden until needed)
        { id: "GF_R", a: "[ TBD ]", b: "[ TBD ]", roundName: "Grand Final Reset" }
      ];

      // Define explicit slot progression linkages.
      type SlotTarget = { matchId: string; slot: "A" | "B" };
      const links: Record<string, { winner?: SlotTarget, loser?: SlotTarget }> = {
        "W_QF_1": { winner: { matchId: "W_SF_1", slot: "A" }, loser: { matchId: "L_R1_1", slot: "A" } },
        "W_QF_2": { winner: { matchId: "W_SF_1", slot: "B" }, loser: { matchId: "L_R1_1", slot: "B" } },
        "W_QF_3": { winner: { matchId: "W_SF_2", slot: "A" }, loser: { matchId: "L_R1_2", slot: "A" } },
        "W_QF_4": { winner: { matchId: "W_SF_2", slot: "B" }, loser: { matchId: "L_R1_2", slot: "B" } },

        "W_SF_1": { winner: { matchId: "W_F", slot: "A" }, loser: { matchId: "L_QF_1", slot: "A" } },
        "W_SF_2": { winner: { matchId: "W_F", slot: "B" }, loser: { matchId: "L_QF_2", slot: "A" } },
        "W_F":    { winner: { matchId: "GF", slot: "A" }, loser: { matchId: "L_F", slot: "A" } },

        "L_R1_1": { winner: { matchId: "L_QF_1", slot: "B" } },
        "L_R1_2": { winner: { matchId: "L_QF_2", slot: "B" } },
        "L_QF_1": { winner: { matchId: "L_SF", slot: "A" } },
        "L_QF_2": { winner: { matchId: "L_SF", slot: "B" } },
        "L_SF":   { winner: { matchId: "L_F", slot: "B" } },
        "L_F":    { winner: { matchId: "GF", slot: "B" } },
      };

      const createdMatchIds: Record<string, string> = {};

      let createdCount = 0;
      // First pass: create all matches to get their DB IDs
      for (const match of matchesToCreate) {
        const dbMatch = await tx.match.create({
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
        createdMatchIds[match.id] = dbMatch.id;
        createdCount++;
      }

      // Map the logical topology to the created database IDs
      const dbTopology: Record<string, { winner?: { matchId: string, slot: "A" | "B" }, loser?: { matchId: string, slot: "A" | "B" } }> = {};

      // Second pass: establish nextWinnerMatchId and nextLoserMatchId for fast traversal,
      // and build the exact dbTopology mapping to save into SystemSetting
      for (const [sourceLogicalId, link] of Object.entries(links)) {
        const sourceDbId = createdMatchIds[sourceLogicalId];

        const updateData: any = {};
        dbTopology[sourceDbId] = {};

        if (link.winner) {
          const targetDbId = createdMatchIds[link.winner.matchId];
          updateData.nextWinnerMatchId = targetDbId;
          dbTopology[sourceDbId].winner = { matchId: targetDbId, slot: link.winner.slot };
        }
        if (link.loser) {
          const targetDbId = createdMatchIds[link.loser.matchId];
          updateData.nextLoserMatchId = targetDbId;
          dbTopology[sourceDbId].loser = { matchId: targetDbId, slot: link.loser.slot };
        }

        await tx.match.update({
          where: { id: sourceDbId },
          data: updateData
        });
      }

      // Store the topology exactly to allow precise placement during settlement
      await tx.systemSetting.upsert({
        where: { key: `BRACKET_TOPOLOGY::${tournamentId}` },
        update: { value: JSON.stringify(dbTopology) },
        create: { key: `BRACKET_TOPOLOGY::${tournamentId}`, value: JSON.stringify(dbTopology) }
      });

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
