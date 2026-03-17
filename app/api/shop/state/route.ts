import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SHOP_ITEMS } from "@/lib/shop-catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const now = new Date();
    const [user, matches, robbieHexCount, activeMegaphones] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          points: true,
          fdShields: true,
          fatalCounters: true,
        },
      }),
      prisma.match.findMany({
        where: {
          status: { in: ["OPEN", "LOCKED"] },
        },
        select: {
          playerA: true,
          playerB: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.robbieHex.count({ where: { createdById: userId } }),
      prisma.megaphoneMessage.count({
        where: {
          userId,
          expiresAt: { gt: now },
        },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const playerSet = new Set<string>();
    matches.forEach((match) => {
      playerSet.add(match.playerA);
      playerSet.add(match.playerB);
    });

    return NextResponse.json({
      items: SHOP_ITEMS,
      inventory: {
        points: user.points,
        fdShields: user.fdShields,
        fatalCounters: user.fatalCounters,
        robbieHexes: robbieHexCount,
        activeMegaphones,
      },
      currentPlayers: Array.from(playerSet).sort((left, right) => left.localeCompare(right)),
    });
  } catch (error) {
    console.error("Failed to fetch shop state:", error);
    return NextResponse.json({ error: "读取黑市状态失败" }, { status: 500 });
  }
}
