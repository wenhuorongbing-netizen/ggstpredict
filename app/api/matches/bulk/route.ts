import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const matches = await request.json();

    if (!Array.isArray(matches) || matches.length === 0) {
      return NextResponse.json(
        { error: "无效的数据格式 (Invalid data format)" },
        { status: 400 }
      );
    }

    const formattedMatches = matches.map((m) => {
      if (!m.playerA || !m.playerB) {
        throw new Error("每场对决都必须包含 Player A 和 Player B");
      }
      return {
        playerA: m.playerA.trim(),
        playerB: m.playerB.trim(),
        charA: m.charA ? m.charA.trim() : null,
        charB: m.charB ? m.charB.trim() : null,
        status: "OPEN",
      };
    });

    // SQLite driver for Prisma does not support createMany. We use a transaction instead.
    const result = await prisma.$transaction(
      formattedMatches.map((match) => prisma.match.create({ data: match }))
    );

    return NextResponse.json({ count: result.length }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to bulk create matches:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create matches" },
      { status: 500 }
    );
  }
}
