import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveBettingClosesAt } from "@/lib/match-betting";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
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

    if (body.action === "SET_BETTING_CLOSE") {
      const bettingClosesAt = resolveBettingClosesAt(
        {
          mode: body.mode,
          delayMinutes: body.delayMinutes,
          closeAt: body.closeAt,
        },
        new Date(),
      );

      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: { bettingClosesAt },
      });

      await prisma.adminLog.create({
        data: {
          action: "Set Betting Close",
          details: `Match ${matchId} closes betting at ${bettingClosesAt.toISOString()}`,
        },
      });

      return NextResponse.json({ match: updatedMatch }, { status: 200 });
    }

    if (body.action === "CLEAR_BETTING_CLOSE") {
      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: { bettingClosesAt: null },
      });

      await prisma.adminLog.create({
        data: {
          action: "Clear Betting Close",
          details: `Match ${matchId} betting close removed`,
        },
      });

      return NextResponse.json({ match: updatedMatch }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update match:", error);
    if (error instanceof Error && (error.message === "封盘分钟数必须大于 0" || error.message === "指定封盘时间无效")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update match" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: matchId } = await context.params;

    if (!matchId) {
      return NextResponse.json(
        { error: "Missing match ID" },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: matchId },
        include: { bets: true },
      });

      if (!match) {
        throw new Error("Match not found");
      }

      if (match.status !== "SETTLED") {
        for (const bet of match.bets) {
          await tx.user.update({
            where: { id: bet.userId },
            data: { points: { increment: bet.amount } },
          });
        }
      }

      await tx.bet.deleteMany({
        where: { matchId },
      });

      await tx.match.delete({
        where: { id: matchId },
      });

      await tx.adminLog.create({
        data: {
          action: "Delete Match",
          details: `Match ${matchId} hard deleted`,
        },
      });
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Failed to delete match:", error);
    if (error.message === "Match not found" || error.message === "Cannot delete a settled match") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to delete match" },
      { status: 500 },
    );
  }
}
