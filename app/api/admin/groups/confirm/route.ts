import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateGroupStatus } from "@/lib/group-stage";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const headerPayload = await headers();
    const userId = headerPayload.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tournamentId, groupCode, action } = await request.json();

    if (!tournamentId || !groupCode || !["CONFIRM", "UNCONFIRM"].includes(action)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const settingKey = `GROUP_CONFIRM::${tournamentId}::${groupCode}`;

    if (action === "UNCONFIRM") {
      await prisma.systemSetting.deleteMany({
        where: { key: settingKey }
      });
      return NextResponse.json({ success: true, message: "Group unconfirmed" });
    }

    // Handle CONFIRM action
    const matches = await prisma.match.findMany({
      where: {
        tournamentId,
        stageType: "GROUP",
        groupName: {
          in: [groupCode, `Group ${groupCode}`]
        }
      }
    });

    const status = evaluateGroupStatus(groupCode, matches, null);

    if (!status.isComplete) {
      return NextResponse.json({ error: "Group is not complete. Cannot confirm." }, { status: 400 });
    }

    const confirmationData = {
      confirmed: true,
      confirmedAt: new Date().toISOString(),
      confirmedBy: userId,
      groupCode: groupCode,
      top2: status.top2Provisional,
      standings: status.standings
    };

    await prisma.systemSetting.upsert({
      where: { key: settingKey },
      update: { value: JSON.stringify(confirmationData) },
      create: { key: settingKey, value: JSON.stringify(confirmationData) }
    });

    return NextResponse.json({ success: true, message: "Group confirmed" });

  } catch (error) {
    console.error("Group confirmation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
