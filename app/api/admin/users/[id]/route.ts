import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    if (typeof body.points !== 'number') {
      return NextResponse.json({ error: "Invalid points value" }, { status: 400 });
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { points: body.points },
        select: { id: true, username: true, displayName: true, points: true }
      });
      await tx.adminLog.create({
        data: {
          action: "Update Balance",
          details: `Updated user ${user.username} (${user.id}) balance to ${body.points}`
        }
      });
      return user;
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error("Failed to update user points:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    // Hard delete user and all their bets
    await prisma.$transaction(async (tx) => {
        await tx.bet.deleteMany({
            where: { userId: id }
        });
        await tx.user.delete({
            where: { id }
        });
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
