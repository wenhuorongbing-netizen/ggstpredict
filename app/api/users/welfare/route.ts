import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.points >= 10) {
        throw new Error("积分仍充足");
      }

      const now = new Date();
      if (user.lastWelfareAt) {
        const hoursSinceLastWelfare =
          (now.getTime() - user.lastWelfareAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastWelfare < 1) {
          const remainingMinutes = Math.ceil((1 - hoursSinceLastWelfare) * 60);
          throw new Error(`冷却中，还需等待 ${remainingMinutes} 分钟`);
        }
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          points: { increment: 50 },
          lastWelfareAt: now,
        },
      });

      return updatedUser;
    });

    return NextResponse.json(
      {
        message: "Meteors falling! You gained 50 PT.",
        points: result.points,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (
      error.message === "User not found" ||
      error.message === "积分仍充足" ||
      error.message.startsWith("冷却中")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Welfare API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
