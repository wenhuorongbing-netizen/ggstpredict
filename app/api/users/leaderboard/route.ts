import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const take = limitParam ? parseInt(limitParam, 10) : 5;

    const topUsers = await prisma.user.findMany({
      orderBy: { points: 'desc' },
      take: isNaN(take) ? 5 : take,
      select: {
        id: true,
        displayName: true,
        points: true,
      },
    });

    return NextResponse.json(topUsers, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
