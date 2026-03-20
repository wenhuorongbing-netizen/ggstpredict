const fs = require('fs');

let file = 'app/api/matches/settle/route.ts';
let content = fs.readFileSync(file, 'utf-8');

const propagationLogic = `
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
`;

// Replace from `      // 4.5 Grand Final Reset Logic` down to `      // 6. Audit Log`
const startMarker = '      // 4.5 Grand Final Reset Logic';
const endMarker = '      // 6. Audit Log';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const before = content.substring(0, startIndex);
  const after = content.substring(endIndex);
  fs.writeFileSync(file, before + propagationLogic.trim() + '\n\n' + after);
}
