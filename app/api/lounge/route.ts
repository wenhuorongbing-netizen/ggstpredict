import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildLooseKey } from "@/lib/tournament-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
    const [robbieHexes, megaphones] = await Promise.all([
      prisma.robbieHex.findMany({
        orderBy: { createdAt: "desc" },
        select: { playerName: true },
      }),
      prisma.megaphoneMessage.findMany({
        where: { expiresAt: { gt: now } },
        orderBy: { createdAt: "desc" },
        take: 24,
        include: {
          user: {
            select: {
              displayName: true,
              nameColor: true,
            },
          },
        },
      }),
    ]);

    const uniqueHexes = Array.from(
      new Map(
        robbieHexes.map((entry) => [buildLooseKey(entry.playerName), entry.playerName]),
      ).values(),
    );

    return NextResponse.json({
      robbieHexes: uniqueHexes,
      megaphones: megaphones.map((entry) => ({
        id: entry.id,
        message: entry.message,
        expiresAt: entry.expiresAt.toISOString(),
        user: {
          displayName: entry.user.displayName,
          nameColor: entry.user.nameColor,
        },
      })),
    });
  } catch (error) {
    console.error("Failed to fetch lounge state:", error);
    return NextResponse.json({ error: "Failed to fetch lounge state" }, { status: 500 });
  }
}
