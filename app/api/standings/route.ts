import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateGroupStandings } from "@/lib/standings";

export async function GET() {
  try {
    const matches = await prisma.match.findMany({
      where: {
        stageType: "GROUP"
      },
      select: {
        playerA: true,
        playerB: true,
        scoreA: true,
        scoreB: true,
        status: true,
        winner: true,
        stageType: true,
        groupId: true,
        groupName: true,
      }
    });

    const standings = calculateGroupStandings(matches);

    return NextResponse.json(standings, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch standings:", error);
    return NextResponse.json(
      { error: "Failed to fetch standings" },
      { status: 500 }
    );
  }
}
