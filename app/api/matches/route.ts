import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const whereClause = status ? { status } : {};

    const matches = await prisma.match.findMany({
      where: whereClause,
      include: {
        bets: {
          include: {
            user: { select: { username: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(matches);
  } catch (error) {
    console.error("Failed to fetch matches:", error);
    return NextResponse.json(
      { error: "Failed to fetch matches" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { playerA, playerB } = await request.json();

    if (!playerA || !playerB) {
      return NextResponse.json(
        { error: "Player A and Player B are required" },
        { status: 400 }
      );
    }

    const match = await prisma.match.create({
      data: {
        playerA,
        playerB,
      },
    });

    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    console.error("Failed to create match:", error);
    return NextResponse.json(
      { error: "Failed to create match" },
      { status: 500 }
    );
  }
}
