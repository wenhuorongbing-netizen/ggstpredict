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

    // Check Extra Stage matches
    const extraMatches = await prisma.match.findMany({
      where: {
        tournamentId,
        stageType: "EXTRA"
      }
    });

    const matchE1 = extraMatches.find(m => m.roundName === "Extra Match 1");
    const matchE2 = extraMatches.find(m => m.roundName === "Extra Match 2");

    if (!matchE1 || !matchE2) {
       return NextResponse.json({ error: "Extra Stage matches (Extra Match 1 & 2) must be created first" }, { status: 400 });
    }

    if (matchE1.status !== "SETTLED" || matchE2.status !== "SETTLED") {
       return NextResponse.json({ error: "Both Extra Stage matches must be SETTLED before generating bracket" }, { status: 400 });
    }

    const winnerE1 = matchE1.winner === "A" ? matchE1.playerA : matchE1.playerB;
    const winnerE2 = matchE2.winner === "A" ? matchE2.playerA : matchE2.playerB;

    // AWT Advanced list tracking (Scoped to tournament)
    const advancedPlayers = [
      top2ByGroup["A"][0],
      top2ByGroup["B"][0],
      top2ByGroup["C"][0],
      top2ByGroup["D"][0],
      winnerE1,
      winnerE2
    ];

    await prisma.$transaction(async (tx) => {
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

      await tx.systemSetting.upsert({
        where: { key: `AWT_ADVANCED_PLAYERS::${tournamentId}` },
        update: { value: JSON.stringify(advancedPlayers) },
        create: { key: `AWT_ADVANCED_PLAYERS::${tournamentId}`, value: JSON.stringify(advancedPlayers) }
      });

      // 8-player Double Elimination Bracket Topology
      const matchesToCreate = [
        // Winners Round 1 (Quarter-Finals)
        { id: "W_QF_1", a: top2ByGroup["A"][0], b: "[ BYE ]", roundName: "Winners Quarter-Final 1" },
        { id: "W_QF_2", a: top2ByGroup["D"][0], b: "[ BYE ]", roundName: "Winners Quarter-Final 2" },
        { id: "W_QF_3", a: top2ByGroup["B"][0], b: winnerE2, roundName: "Winners Quarter-Final 3" },
        { id: "W_QF_4", a: top2ByGroup["C"][0], b: winnerE1, roundName: "Winners Quarter-Final 4" },

        // Winners Semi-Finals
        // W_SF_1 auto-advances A1 due to W_QF_1 bye
        { id: "W_SF_1", a: top2ByGroup["A"][0], b: top2ByGroup["D"][0], roundName: "Winners Semi-Final 1" },
        { id: "W_SF_2", a: "[ TBD ]", b: "[ TBD ]", roundName: "Winners Semi-Final 2" },

        // Winners Final
        { id: "W_F", a: "[ TBD ]", b: "[ TBD ]", roundName: "Winners Final" },

        // Losers Round 1
        // In a true 6-player bracket:
        // W_QF_1 and W_QF_2 are BYES. Their "losers" are BYEs.
        // W_QF_3 and W_QF_4 are real. Their losers are real.
        // L_R1_1 connects loser W_QF_1 (BYE) and loser W_QF_2 (BYE). So L_R1_1 is purely a BYE.
        // L_R1_2 connects loser W_QF_3 (Real) and loser W_QF_4 (Real). So L_R1_2 is a real match.
        { id: "L_R1_1", a: "[ BYE ]", b: "[ BYE ]", roundName: "Losers Round 1 (1)" },
        { id: "L_R1_2", a: "[ TBD ]", b: "[ TBD ]", roundName: "Losers Round 1 (2)" },

        // Losers Quarter-Finals
        // L_QF_1 gets loser W_SF_1 (Real) vs winner L_R1_1 (BYE). So L_QF_1 is a BYE for the W_SF_1 loser.
        { id: "L_QF_1", a: "[ TBD ]", b: "[ BYE ]", roundName: "Losers Quarter-Final 1" },
        // L_QF_2 gets loser W_SF_2 (Real) vs winner L_R1_2 (Real). So L_QF_2 is a real match.
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
        const isByeMatch = match.a === "[ BYE ]" || match.b === "[ BYE ]";
        const isPlaceholder = match.a === "[ TBD ]" && match.b === "[ TBD ]";

        let status = "OPEN";
        let winner = null;

        if (isPlaceholder) {
            status = "LOCKED";
        } else if (isByeMatch) {
            // Wait, if it's L_QF_1 (TBD vs BYE), we shouldn't pre-settle it because the TBD is waiting for a real loser to arrive.
            // If it's pre-settled, the real loser dropping in later will trigger logic that expects an OPEN/LOCKED match,
            // or the tournament operator will never see it pop open.
            // We should only pre-settle BYE matches where the actual combatant is ALREADY KNOWN,
            // or if both are BYE (dead node).
            const isCombatantKnown = (match.a !== "[ BYE ]" && match.a !== "[ TBD ]") || (match.b !== "[ BYE ]" && match.b !== "[ TBD ]");
            const isDoubleBye = match.a === "[ BYE ]" && match.b === "[ BYE ]";

            if (isCombatantKnown || isDoubleBye) {
                status = "SETTLED"; // Auto-advance the bye
                if (match.a !== "[ BYE ]" && match.a !== "[ TBD ]") winner = "A";
                else if (match.b !== "[ BYE ]" && match.b !== "[ TBD ]") winner = "B";
                // If both are BYE, winner remains null, it's a dead node.
            } else {
                status = "LOCKED"; // Waiting for the TBD to be filled by a real player
            }
        }

        const dbMatch = await tx.match.create({
          data: {
            tournamentId,
            playerA: match.a,
            playerB: match.b,
            stageType: "BRACKET",
            roundName: match.roundName,
            status,
            winner,
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
