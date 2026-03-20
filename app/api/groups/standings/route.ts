import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateGroupStandings } from "@/lib/standings";
import { evaluateGroupStatus } from "@/lib/group-stage";

export async function GET(request: Request) {
  try {
    const groupMatches = await prisma.match.findMany({
      where: { stageType: "GROUP" },
      orderBy: { createdAt: "asc" }
    });

    // 1. Calculate traditional standings
    const rawStandings = calculateGroupStandings(groupMatches);

    // 2. Fetch confirmation states
    const confirmationSettings = await prisma.systemSetting.findMany({
      where: { key: { startsWith: "GROUP_CONFIRM::" } }
    });

    const confirmations: Record<string, any> = {};
    for (const setting of confirmationSettings) {
      try {
        const data = JSON.parse(setting.value);
        if (data.groupCode) {
          confirmations[data.groupCode] = data;
        }
      } catch (e) {
        // ignore invalid json
      }
    }

    // 3. Build comprehensive group status
    const groupStatuses = rawStandings.map(group => {
       const code = group.groupName.replace(/^GROUP\s+/i, '').trim();
       const confirmationState = confirmations[code] || null;
       const status = evaluateGroupStatus(code, groupMatches, confirmationState);

       return {
         ...group,
         status
       };
    });

    return NextResponse.json(groupStatuses);
  } catch (error) {
    console.error("Failed to fetch group standings:", error);
    return NextResponse.json({ error: "Failed to fetch group standings" }, { status: 500 });
  }
}
