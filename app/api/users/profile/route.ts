import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        bets: {
          include: {
            match: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hexedSetting = await prisma.systemSetting.findUnique({
      where: { key: "HEXED_PLAYERS" }
    });

    const hexedPlayers = hexedSetting ? hexedSetting.value.split(',').filter(Boolean).map(p => p.toLowerCase()) : [];
    const isHexed = hexedPlayers.includes(user.displayName.toLowerCase());

    // Omit sensitive data
    const safeUser = {
      id: user.id,
      displayName: user.displayName,
      nameColor: user.nameColor,
      points: user.points,
      winStreak: user.winStreak,
      fdShields: user.fdShields ?? 0,
      fatalCounters: user.fatalCounters ?? 0,
      isHexed,
      bets: user.bets,
    };

    return NextResponse.json({ user: safeUser }, { status: 200 });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
