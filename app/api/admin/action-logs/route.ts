import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const logs = await prisma.actionLog.findMany({
      take: 50,
      orderBy: { createdAt: "desc" }
    });

    // Manually join user data to avoid schema relation requirements
    const userIds = logs.filter(l => l.userId).map(l => l.userId) as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, nameColor: true, username: true }
    });

    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as any);

    const logsWithUser = logs.map(log => ({
      ...log,
      user: log.userId ? userMap[log.userId] : null
    }));

    return NextResponse.json(logsWithUser, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch action logs:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
