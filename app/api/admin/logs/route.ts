import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logs = await prisma.adminLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(logs, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch admin logs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
