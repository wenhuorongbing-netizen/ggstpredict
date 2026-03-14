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
        throw new Error("积分充足，无需救治");
      }

      const now = new Date();
      if (user.lastWelfareAt) {
        const hoursSinceLastWelfare =
          (now.getTime() - user.lastWelfareAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastWelfare < 1) {
          const remainingMinutes = Math.ceil((1 - hoursSinceLastWelfare) * 60);
          throw new Error(`Faust 正在冷却中，请稍后再来 (${remainingMinutes}分钟)`);
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
        message: "流星坠落！成功恢复 50 积分。",
        points: result.points,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const error = err as any;
    if (
      error.message === "User not found" ||
      error.message === "积分充足，无需救治" ||
      error.message.startsWith("Faust 正在冷却中")
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
