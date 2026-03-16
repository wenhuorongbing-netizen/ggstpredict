import { PrismaClient } from "@prisma/client";
import { getCanonicalMatchUpdates, type MatchIdentityInput } from "@/lib/tournament-data";

type MatchPrismaClient = PrismaClient;

const MATCH_SELECT = {
  id: true,
  playerA: true,
  playerB: true,
  charA: true,
  charB: true,
  createdAt: true,
} as const;

export async function synchronizeCanonicalMatchData(prisma: MatchPrismaClient) {
  const matches = (await prisma.match.findMany({
    select: MATCH_SELECT,
    orderBy: { createdAt: "asc" },
  })) as MatchIdentityInput[];
  const updates = getCanonicalMatchUpdates(matches);

  for (const update of updates) {
    await prisma.match.update({
      where: { id: update.id },
      data: {
        playerA: update.playerA,
        playerB: update.playerB,
        charA: update.charA,
        charB: update.charB,
      },
    });
  }

  return updates.length;
}
