import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tensionSetting = await prisma.systemSetting.findUnique({
      where: { key: "GLOBAL_TENSION" }
    });

    const tension = tensionSetting ? parseInt(tensionSetting.value, 10) : 0;

    return NextResponse.json({ tension }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch tension:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
