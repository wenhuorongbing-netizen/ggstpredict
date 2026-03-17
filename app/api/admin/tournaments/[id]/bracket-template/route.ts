import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildAwtKoreaBracketPlaceholderMatches,
  buildAwtKoreaBracketTemplate,
  formatMatchRef,
} from "@/lib/awt-korea-bracket";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: tournamentId } = await context.params;

    if (!tournamentId) {
      return NextResponse.json({ error: "Missing tournament ID" }, { status: 400 });
    }

    const template = buildAwtKoreaBracketTemplate();
    const placeholders = buildAwtKoreaBracketPlaceholderMatches();

    const result = await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId },
        include: { matches: true },
      });

      if (!tournament) {
        throw new Error("Tournament not found");
      }

      const existingBracketCount = tournament.matches.filter(
        (match) => (match.stageType ?? "").toUpperCase() === "BRACKET",
      ).length;

      if (existingBracketCount > 0) {
        throw new Error("Bracket template already exists");
      }

      const matchIds = new Map<string, string>();

      for (const entry of placeholders) {
        const createdMatch = await tx.match.create({
          data: {
            tournamentId,
            stageType: "BRACKET",
            roundName: entry.roundName,
            status: "LOCKED",
            playerA: entry.playerA,
            playerB: entry.playerB,
            charA: entry.charA,
            charB: entry.charB,
          },
        });

        matchIds.set(entry.key, createdMatch.id);
      }

      for (const entry of template) {
        const matchId = matchIds.get(entry.key);
        if (!matchId) {
          continue;
        }

        await tx.match.update({
          where: { id: matchId },
          data: {
            nextWinnerMatchId: entry.nextWinner
              ? formatMatchRef(matchIds.get(entry.nextWinner.key) ?? "", entry.nextWinner.slot)
              : null,
            nextLoserMatchId: entry.nextLoser
              ? formatMatchRef(matchIds.get(entry.nextLoser.key) ?? "", entry.nextLoser.slot)
              : null,
          },
        });
      }

      await tx.adminLog.create({
        data: {
          action: "Generate AWT Korea Bracket Template",
          details: `Tournament ${tournamentId} received ${template.length} bracket placeholder matches`,
        },
      });

      return {
        created: template.length,
      };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate bracket template";
    console.error("Failed to generate bracket template:", error);

    if (message === "Tournament not found" || message === "Bracket template already exists") {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to generate bracket template" }, { status: 500 });
  }
}
