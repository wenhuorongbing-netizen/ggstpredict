import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const token = process.env.STARTGG_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: "服务器未配置 STARTGG_TOKEN" },
        { status: 500 }
      );
    }

    const { phaseGroupId } = await request.json();

    if (!phaseGroupId) {
      return NextResponse.json(
        { error: "缺少 phaseGroupId 参数" },
        { status: 400 }
      );
    }

    const query = `
      query GetPhaseGroupSets($phaseGroupId: ID!) {
        phaseGroup(id: $phaseGroupId) {
          sets(page: 1, perPage: 64, sortType: STANDARD) {
            nodes {
              slots {
                entrant {
                  name
                }
              }
            }
          }
        }
      }
    `;

    const variables = { phaseGroupId };

    const response = await fetch("https://api.start.gg/gql/alpha", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || "Start.gg API request failed" },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.errors) {
      return NextResponse.json(
        { error: data.errors[0]?.message || "GraphQL Error" },
        { status: 500 }
      );
    }

    const nodes = data.data?.phaseGroup?.sets?.nodes || [];
    const validMatches: string[] = [];

    for (const node of nodes) {
      const slots = node.slots;
      if (slots && slots.length === 2) {
        const entrant1 = slots[0]?.entrant;
        const entrant2 = slots[1]?.entrant;

        if (entrant1?.name && entrant2?.name) {
          validMatches.push(`${entrant1.name} vs ${entrant2.name}`);
        }
      }
    }

    // Log the successful scrape
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.adminLog.create({
        data: {
          action: "STARTGG_SCRAPE",
          details: `Start.gg 官方抓取成功 (Phase Group: ${phaseGroupId}), 抓取 ${validMatches.length} 场比赛`
        }
      });
    } catch (logError) {
      console.error("Failed to log start.gg scrape", logError);
    }

    return NextResponse.json({ matches: validMatches }, { status: 200 });
  } catch (error: any) {
    console.error("Start.gg GraphQL bridge error:", error);
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.adminLog.create({
        data: {
          action: "STARTGG_SCRAPE_ERROR",
          details: `Start.gg API Error: ${error.message || "Unknown error"}`
        }
      });
    } catch (logError) {}

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
