import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Initialize Prisma Client
let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!(global as any).prisma) {
    (global as any).prisma = new PrismaClient();
  }
  prisma = (global as any).prisma;
}

export async function POST(req: Request) {
  try {
    const { userId, matchId } = await req.json();

    if (!userId || !matchId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Wrap in a transaction to ensure atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find the match and verify it's OPEN
      const match = await tx.match.findUnique({
        where: { id: matchId },
      });

      if (!match) throw new Error("Match not found");
      if (match.status !== "OPEN") throw new Error("Cannot cancel bet for a match that is not OPEN");

      // 2. Find the user's bet for this match
      const bet = await tx.bet.findFirst({
        where: {
          userId,
          matchId,
        },
      });

      if (!bet) throw new Error("No bet found for this user and match");

      // 3. Calculate refund (95%)
      const refund = Math.floor(bet.amount * 0.95);

      // 4. Refund points to user
      await tx.user.update({
        where: { id: userId },
        data: { points: { increment: refund } },
      });

      // 5. Delete the bet
      await tx.bet.delete({
        where: { id: bet.id },
      });

      return { refund, originalAmount: bet.amount };
    });

    return NextResponse.json({ message: "Bet cancelled successfully", refund: result.refund });

  } catch (error: any) {
    console.error("Cancel bet error:", error);
    return NextResponse.json({ error: error.message || "Failed to cancel bet" }, { status: 500 });
  }
}
