import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const codes = await prisma.inviteCode.findMany({
      where: { used: false },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(codes);
  } catch (error) {
    console.error("Failed to fetch invite codes:", error);
    return NextResponse.json(
      { error: "Failed to fetch invite codes" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newCode = `GGST-${randomStr}`;

    const inviteCode = await prisma.inviteCode.create({
      data: { code: newCode },
    });

    return NextResponse.json(inviteCode, { status: 201 });
  } catch (error) {
    console.error("Failed to generate invite code:", error);
    return NextResponse.json(
      { error: "Failed to generate invite code" },
      { status: 500 }
    );
  }
}
