import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateGroupStandings } from "@/lib/standings";
import { evaluateGroupStatus } from "@/lib/group-stage";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get("tournamentId");

    const whereClause: any = { stageType: "GROUP" };
    if (tournamentId) {
      whereClause.tournamentId = tournamentId;
    }

    const groupMatches = await prisma.match.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" }
    });

    // 1. Calculate traditional standings
    const rawStandings = calculateGroupStandings(groupMatches);

    // 2. Fetch confirmation states
    const confirmationSettings = await prisma.systemSetting.findMany({
      where: {
        key: {
          startsWith: tournamentId ? `GROUP_CONFIRM::${tournamentId}::` : "GROUP_CONFIRM::"
        }
      }
    });

    const confirmations: Record<string, any> = {};
    for (const setting of confirmationSettings) {
      try {
        const data = JSON.parse(setting.value);
        // Only use the confirmation if it belongs to the current tournament (or if no tournament is specified, which shouldn't happen ideally but for safety)
        if (data.groupCode) {
           // We extract groupCode from the key format GROUP_CONFIRM::<tournamentId>::<groupCode>
           // If we have a tournamentId, ensure the key matches it
           if (tournamentId && !setting.key.startsWith(`GROUP_CONFIRM::${tournamentId}::`)) {
             continue; // Should not happen due to query, but good for safety
           }
           const parts = setting.key.split("::");
           const extractedGroupCode = parts.length === 3 ? parts[2] : data.groupCode;
           confirmations[extractedGroupCode] = data;
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
