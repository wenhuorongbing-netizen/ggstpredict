import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    const welfareThreshold = 50;
    const welfareAmount = 50;

    if (!userId) {
      return NextResponse.json({ error: "\u7f3a\u5c11 userId" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("\u627e\u4e0d\u5230\u8be5\u7528\u6237");
      }

      if (user.points >= welfareThreshold) {
        throw new Error("\u4f59\u989d\u5c1a\u53ef\uff0c\u6682\u65f6\u4e0d\u9700\u8981\u6025\u6551\u8865\u52a9");
      }

      const now = new Date();
      if (user.lastWelfareAt) {
        const hoursSinceLastWelfare =
          (now.getTime() - user.lastWelfareAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastWelfare < 1) {
          const remainingMinutes = Math.ceil((1 - hoursSinceLastWelfare) * 60);
          throw new Error(`\u6025\u6551\u8865\u52a9\u51b7\u5374\u4e2d\uff0c\u8bf7 ${remainingMinutes} \u5206\u949f\u540e\u518d\u8bd5`);
        }
      }

      return tx.user.update({
        where: { id: userId },
        data: {
          points: { increment: welfareAmount },
          lastWelfareAt: now,
        },
      });
    });

    return NextResponse.json(
      {
        message: `\u6025\u6551\u8865\u52a9\u5df2\u5230\u8d26\uff0c\u5df2\u6062\u590d ${welfareAmount} W$`,
        points: result.points,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const error = err as Error;

    if (
      error.message === "\u627e\u4e0d\u5230\u8be5\u7528\u6237" ||
      error.message === "\u4f59\u989d\u5c1a\u53ef\uff0c\u6682\u65f6\u4e0d\u9700\u8981\u6025\u6551\u8865\u52a9" ||
      error.message.startsWith("\u6025\u6551\u8865\u52a9\u51b7\u5374\u4e2d")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Welfare API Error:", error);
    return NextResponse.json({ error: "\u670d\u52a1\u5668\u5185\u90e8\u9519\u8bef" }, { status: 500 });
  }
}
