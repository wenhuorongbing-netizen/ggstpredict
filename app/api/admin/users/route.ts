import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        points: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        points: 'desc'
      }
    });
    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch all users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
