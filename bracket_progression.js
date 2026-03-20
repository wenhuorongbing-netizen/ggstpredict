const fs = require('fs');

const generatorPath = 'app/api/admin/tournaments/generate-bracket/route.ts';
let generatorCode = fs.readFileSync(generatorPath, 'utf8');

// I will re-write the matchesToCreate loop in generate-bracket to track the created nodes
// and link them together using their IDs.

const bracketLogic = `
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

      // Define progression linkages.
      // Format: sourceMatchId: { winnerGoesTo: destMatchId, loserGoesTo: destMatchId }
      const links: Record<string, { winner: string, loser: string }> = {
        "W_QF_1": { winner: "W_SF_1", loser: "L_R1_1" },
        "W_QF_2": { winner: "W_SF_1", loser: "L_R1_1" },
        "W_QF_3": { winner: "W_SF_2", loser: "L_R1_2" },
        "W_QF_4": { winner: "W_SF_2", loser: "L_R1_2" },
        "W_SF_1": { winner: "W_F", loser: "L_QF_1" },
        "W_SF_2": { winner: "W_F", loser: "L_QF_2" },
        "W_F":    { winner: "GF", loser: "L_F" },

        "L_R1_1": { winner: "L_QF_1", loser: "" },
        "L_R1_2": { winner: "L_QF_2", loser: "" },
        "L_QF_1": { winner: "L_SF", loser: "" },
        "L_QF_2": { winner: "L_SF", loser: "" },
        "L_SF":   { winner: "L_F", loser: "" },
        "L_F":    { winner: "GF", loser: "" },

        "GF":     { winner: "", loser: "" }, // GF handles reset differently
        "GF_R":   { winner: "", loser: "" }
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

      // Second pass: establish nextWinnerMatchId and nextLoserMatchId
      for (const [sourceId, link] of Object.entries(links)) {
        if (!link.winner && !link.loser) continue;

        const updateData: any = {};
        if (link.winner) updateData.nextWinnerMatchId = createdMatchIds[link.winner];
        if (link.loser) updateData.nextLoserMatchId = createdMatchIds[link.loser];

        await tx.match.update({
          where: { id: createdMatchIds[sourceId] },
          data: updateData
        });
      }
`;

// Replace from `// 8-player Double Elimination Bracket Topology` down to `createdCount++;\n      }`
const startMarker = '// 8-player Double Elimination Bracket Topology';
const endMarker = 'createdCount++;\n      }';

const startIndex = generatorCode.indexOf(startMarker);
const endIndex = generatorCode.indexOf(endMarker, startIndex) + endMarker.length;

if (startIndex !== -1 && endIndex !== -1) {
  const before = generatorCode.substring(0, startIndex);
  const after = generatorCode.substring(endIndex);
  fs.writeFileSync(generatorPath, before + bracketLogic.trim() + after);
}
