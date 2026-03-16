import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { synchronizeCanonicalMatchData } from "@/lib/match-data-maintenance";

export async function GET() {
  try {
    await synchronizeCanonicalMatchData(prisma);

    // For MVP, just get the most recently created active tournament
    // and include all its associated matches
    const tournament = await prisma.tournament.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        matches: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!tournament) {
      // If none exists, return a 404 or a null object
      return NextResponse.json({ tournament: null }, { status: 200 });
    }

    return NextResponse.json({ tournament }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch tournament:", error);
    return NextResponse.json(
      { error: "Failed to fetch tournament" },
      { status: 500 }
    );
  }
}
