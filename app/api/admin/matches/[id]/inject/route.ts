import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { poolInjectA, poolInjectB } = body;

    if (typeof poolInjectA !== 'number' || typeof poolInjectB !== 'number') {
        return NextResponse.json({ error: "Invalid injection parameters" }, { status: 400 });
    }

    const match = await prisma.match.findUnique({ where: { id } });
    if (!match) {
        return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const updatedMatch = await prisma.match.update({
      where: { id },
      data: {
        poolInjectA: { increment: poolInjectA },
        poolInjectB: { increment: poolInjectB },
      }
    });

    return NextResponse.json(updatedMatch, { status: 200 });
  } catch (error) {
    console.error("Failed to inject funds:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
