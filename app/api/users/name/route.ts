import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  try {
    const { userId, displayName } = await request.json();

    if (!userId || !displayName) {
      return NextResponse.json(
        { error: "userId and displayName are required" },
        { status: 400 }
      );
    }

    const trimmedName = displayName.trim();

    if (trimmedName.length === 0 || trimmedName.length > 15) {
      return NextResponse.json(
        { error: "Display name must be between 1 and 15 characters" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { displayName: trimmedName },
    });

    return NextResponse.json(
      { displayName: updatedUser.displayName },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to update display name:", error);
    return NextResponse.json(
      { error: "Failed to update display name" },
      { status: 500 }
    );
  }
}
