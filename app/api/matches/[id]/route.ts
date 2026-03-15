import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await context.params;
    const body = await request.json();

    if (!matchId) {
      return NextResponse.json({ error: "Missing match ID" }, { status: 400 });
    }

    if (body.action === "UNLOCK") {
      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: { status: "OPEN" },
      });
      return NextResponse.json({ match: updatedMatch }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update match:", error);
    return NextResponse.json(
      { error: "Failed to update match" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await context.params;

    if (!matchId) {
      return NextResponse.json(
        { error: "Missing match ID" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. Fetch the match and all its associated bets
      const match = await tx.match.findUnique({
        where: { id: matchId },
        include: { bets: true },
      });

      if (!match) {
        throw new Error("Match not found");
      }

      // If it's settled, the points were already distributed, so hard deleting means
      // we just wipe the records. Refunding a settled match is too complex and would cause inflation.
      // So if NOT settled, refund. If SETTLED, just delete bets without refund.
      if (match.status !== "SETTLED") {
        // 2. Refund all users who placed bets on this match
        for (const bet of match.bets) {
          await tx.user.update({
            where: { id: bet.userId },
            data: { points: { increment: bet.amount } },
          });
        }
      }

      // 3. Delete all associated bets
      await tx.bet.deleteMany({
        where: { matchId: matchId },
      });

      // 4. Delete the match
      await tx.match.delete({
        where: { id: matchId },
      });

      await tx.adminLog.create({
        data: {
          action: "Delete Match",
          details: `Match ${matchId} hard deleted`
        }
      });
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const error = err as any;
    console.error("Failed to delete match:", error);
    if (error.message === "Match not found" || error.message === "Cannot delete a settled match") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to delete match" },
      { status: 500 }
    );
  }
}
