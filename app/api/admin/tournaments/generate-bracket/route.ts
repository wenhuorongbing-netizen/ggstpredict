import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const headerPayload = await headers();
    const userId = headerPayload.get("x-user-id");
    const role = headerPayload.get("x-user-role");

    if (!userId || role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tournamentId } = await request.json();

    if (!tournamentId) {
      return NextResponse.json({ error: "Tournament ID required" }, { status: 400 });
    }

    const groups = ["A", "B", "C", "D"];
    const top2ByGroup: Record<string, string[]> = {};

    for (const group of groups) {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: `GROUP_CONFIRM::${tournamentId}::${group}` }
      });

      if (!setting) {
        return NextResponse.json({ error: `Group ${group} not confirmed` }, { status: 400 });
      }

      const data = JSON.parse(setting.value);
      top2ByGroup[group] = data.top2;
    }

    // AWT Advanced list tracking (Side effect from original)
    const advancedPlayers = [
      ...top2ByGroup["A"],
      ...top2ByGroup["B"],
      ...top2ByGroup["C"],
      ...top2ByGroup["D"],
    ];

    await prisma.$transaction(async (tx) => {
      // Create bracket matches based on frozen top2 (this is a placeholder for actual generation which is Sprint 2, but we need to satisfy Sprint 1 bounds)
      await tx.systemSetting.upsert({
        where: { key: "AWT_ADVANCED_PLAYERS" },
        update: { value: JSON.stringify(advancedPlayers) },
        create: { key: "AWT_ADVANCED_PLAYERS", value: JSON.stringify(advancedPlayers) }
      });

      // Simple implementation just creates 4 quarter final matches from the top 2
      const pairings = [
        { a: top2ByGroup["A"][0], b: top2ByGroup["B"][1] },
        { a: top2ByGroup["C"][0], b: top2ByGroup["D"][1] },
        { a: top2ByGroup["B"][0], b: top2ByGroup["A"][1] },
        { a: top2ByGroup["D"][0], b: top2ByGroup["C"][1] },
      ];

      for (const pair of pairings) {
        await tx.match.create({
          data: {
            tournamentId,
            playerA: pair.a,
            playerB: pair.b,
            stageType: "BRACKET",
            status: "OPEN",
            poolInjectA: 0,
            poolInjectB: 0,
          }
        });
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Generate bracket error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
