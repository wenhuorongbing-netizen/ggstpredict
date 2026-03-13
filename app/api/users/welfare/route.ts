import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.points >= 10) {
      return NextResponse.json({ error: "积分仍充足" }, { status: 400 });
    }

    const now = new Date();
    if (user.lastWelfareAt) {
      const hoursSinceLastWelfare =
        (now.getTime() - user.lastWelfareAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastWelfare < 1) {
        const remainingMinutes = Math.ceil((1 - hoursSinceLastWelfare) * 60);
        return NextResponse.json(
          { error: `冷却中，还需等待 ${remainingMinutes} 分钟` },
          { status: 400 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        points: { increment: 50 },
        lastWelfareAt: now,
      },
    });

    return NextResponse.json(
      {
        message: "Meteors falling! You gained 50 PT.",
        points: updatedUser.points,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Welfare API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
