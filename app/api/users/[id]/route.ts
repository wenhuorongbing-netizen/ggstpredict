import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        displayName: true,
        points: true,
        role: true,
        winStreak: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hexedSetting = await prisma.systemSetting.findUnique({
      where: { key: "HEXED_PLAYERS" }
    });

    const hexedPlayers = hexedSetting ? hexedSetting.value.split(',').filter(Boolean).map(p => p.toLowerCase()) : [];
    const isHexed = hexedPlayers.includes((user.displayName || user.username).toLowerCase());

    return NextResponse.json({ ...user, isHexed });
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
