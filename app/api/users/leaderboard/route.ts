import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const pageParam = searchParams.get('page');
    const take = limitParam ? parseInt(limitParam, 10) : 10;
    const page = pageParam ? parseInt(pageParam, 10) : 1;

    const validTake = isNaN(take) ? 10 : take;
    const validPage = isNaN(page) ? 1 : page;
    const skip = (validPage - 1) * validTake;

    const [topUsers, totalCount] = await Promise.all([
      prisma.user.findMany({
        orderBy: { points: 'desc' },
        take: validTake,
        skip: skip,
        select: {
          id: true,
          displayName: true,
          points: true,
        },
      }),
      prisma.user.count()
    ]);

    const totalPages = Math.ceil(totalCount / validTake);

    return NextResponse.json({
        users: topUsers,
        totalPages: totalPages,
        currentPage: validPage
    }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
