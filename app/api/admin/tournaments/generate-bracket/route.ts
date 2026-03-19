import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateGroupStandings } from "@/lib/standings";

export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, displayName: true }
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. 获取所有已结算的小组赛
    const groupMatches = await prisma.match.findMany({
      where: {
        stageType: "GROUP",
        status: "SETTLED"
      }
    });

    if (groupMatches.length === 0) {
      return NextResponse.json({ error: "未找到任何已结算的小组赛数据！" }, { status: 400 });
    }

    // 2. 使用现有的算法计算出所有小组排名
    const allStandings = calculateGroupStandings(groupMatches);

    // We expect typical group names like "A", "B", "C", "D"
    const requiredGroups = ["A", "B", "C", "D"];
    const top8Players: { group: string, rank: number, name: string, character: string }[] = [];

    for (const group of requiredGroups) {
      // Find case-insensitive group match, just in case
      const groupObj = allStandings.find(g => g.groupName.toUpperCase() === group || g.groupName.toUpperCase() === `GROUP ${group}`);

      if (!groupObj || groupObj.standings.length < 2) {
         return NextResponse.json({ error: `小组 ${group} 数据不足，无法决出前两名。确保每个小组都打完了。`, standings: allStandings }, { status: 400 });
      }

      // 提取小组第一和第二
      const sortedGroup = groupObj.standings;
      // In PlayerStanding, the property is 'playerName', and character is not guaranteed but we can map character empty.
      top8Players.push({ group, rank: 1, name: sortedGroup[0].playerName, character: "" });
      top8Players.push({ group, rank: 2, name: sortedGroup[1].playerName, character: "" });
    }

    // 3. 构建交叉对阵表 (Seed Matches)
    // 胜者组: A1 vs D2, B1 vs C2, C1 vs B2, D1 vs A2 (This is one standard. Another is A1vD2, B1vC2 // C1vB2, D1vA2 but typically top 8 double elim starts with:
    // WQ1: A1 vs D2 (or C2)
    // WQ2: B1 vs C2
    // We will do a generic standard 8-man cross: A1vD2, B1vC2, C1vB2, D1vA2
    // Wait, the prompt said:
    // "胜者组 (Winners)：拿到 4 个小组的第一名 (1st Place)。 败者组 (Losers)：拿到 4 个小组的第二名 (2nd Place)。"
    // "对阵示例 (Winners Quarter-Finals)：A1 vs D2, B1 vs C2。（如果你不知道标准对阵，也可以随机打乱分配，只要第一名打第二名即可）。"
    // So the actual requested rule is 1st vs 2nd in the FIRST ROUND of the bracket.
    // BUT the prompt explicitly says "胜者组: 1st place. 败者组: 2nd place" AND "A1 vs D2" for Winners Quarter.
    // That means A1 and D1 are both winners, but A1 vs D2 makes D2 a winner bracket starter.
    // Let's stick to the exact prompt "只要第一名打第二名即可" for Winners Quarters.

    // Wait, let's implement the standard Double Elim cross from Groups:
    // WQ1: A1 vs D2
    // WQ2: B1 vs C2
    // WQ3: C1 vs B2
    // WQ4: D1 vs A2
    // Actually, standard is A1 vs D2. B1 vs C2.
    // ALL these 8 start in Winners. The losers of these drop to Losers Bracket.

    const getP = (group: string, rank: number) => top8Players.find(p => p.group === group && p.rank === rank)!;

    const matchesToCreate = [
      {
        playerA: getP("A", 1).name,
        charA: getP("A", 1).character,
        playerB: getP("D", 2).name,
        charB: getP("D", 2).character,
        stageType: "BRACKET",
        roundName: "Winners Quarter-Final 1",
        status: "OPEN"
      },
      {
        playerA: getP("B", 1).name,
        charA: getP("B", 1).character,
        playerB: getP("C", 2).name,
        charB: getP("C", 2).character,
        stageType: "BRACKET",
        roundName: "Winners Quarter-Final 2",
        status: "OPEN"
      },
      {
        playerA: getP("C", 1).name,
        charA: getP("C", 1).character,
        playerB: getP("B", 2).name,
        charB: getP("B", 2).character,
        stageType: "BRACKET",
        roundName: "Winners Quarter-Final 3",
        status: "OPEN"
      },
      {
        playerA: getP("D", 1).name,
        charA: getP("D", 1).character,
        playerB: getP("A", 2).name,
        charB: getP("A", 2).character,
        stageType: "BRACKET",
        roundName: "Winners Quarter-Final 4",
        status: "OPEN"
      }
    ];

    // Placeholder for Losers Round 1 (to be filled as WQs settle)
    const losersPlaceholders = [
      {
        playerA: "TBD",
        charA: "",
        playerB: "TBD",
        charB: "",
        stageType: "BRACKET",
        roundName: "Losers Round 1",
        status: "LOCKED"
      },
      {
        playerA: "TBD",
        charA: "",
        playerB: "TBD",
        charB: "",
        stageType: "BRACKET",
        roundName: "Losers Round 1",
        status: "LOCKED"
      }
    ];

    // 4. Save to database using transaction
    const advancedNames = top8Players.map(p => p.name).join(", ");

    await prisma.$transaction(async (tx) => {
      // Create Winners Quarter Matches
      for (const m of matchesToCreate) {
        await tx.match.create({ data: m });
      }

      // Create Losers placeholders just to build the visual tree
      for (const m of losersPlaceholders) {
        await tx.match.create({ data: m });
      }

      // Log the action
      await tx.actionLog.create({
        data: {
          actionType: "ADMIN_SETTLE",
          userId: userId,
          details: `Admin ${user.displayName} 触发了赛事自动流转引擎：生成八强淘汰赛！晋级选手: ${advancedNames}`
        }
      });

      // Update global AWT_ADVANCED_PLAYERS setting
      await tx.systemSetting.upsert({
        where: { key: "AWT_ADVANCED_PLAYERS" },
        create: { key: "AWT_ADVANCED_PLAYERS", value: advancedNames },
        update: { value: advancedNames }
      });
    });

    return NextResponse.json({ success: true, advanced: advancedNames }, { status: 200 });
  } catch (error: any) {
    console.error("Bracket generation failed:", error);
    return NextResponse.json({ error: error.message || "Failed to generate bracket" }, { status: 500 });
  }
}
