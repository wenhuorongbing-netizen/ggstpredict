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

    const result = await prisma.$transaction(async (tx) => {
      const inviteCode = await tx.inviteCode.create({
        data: { code: newCode },
      });
      await tx.adminLog.create({
        data: {
          action: "GENERATE_INVITE",
          details: `生成密钥: ${newCode}`
        }
      });
      return inviteCode;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to generate invite code:", error);
    return NextResponse.json(
      { error: "Failed to generate invite code" },
      { status: 500 }
    );
  }
}
