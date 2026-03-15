import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const matches = await prisma.match.findMany({
      select: {
        playerA: true,
        playerB: true,
      },
    });

    const uniquePlayers = new Set<string>();

    matches.forEach((match) => {
      const pA = match.playerA.trim();
      const pB = match.playerB.trim();

      if (pA && pA.toUpperCase() !== "TBD") {
        uniquePlayers.add(pA);
      }
      if (pB && pB.toUpperCase() !== "TBD") {
        uniquePlayers.add(pB);
      }
    });

    const playersArray = Array.from(uniquePlayers);

    if (playersArray.length === 0) {
      return NextResponse.json(
        { error: "No valid players found in the database." },
        { status: 400 }
      );
    }

    const pythonRes = await fetch("http://localhost:8000/crawl-players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ players: playersArray }),
    });

    if (!pythonRes.ok) {
      const errorData = await pythonRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || "Failed to trigger scraper service." },
        { status: 500 }
      );
    }

    const data = await pythonRes.json();
    return NextResponse.json({ message: "Scraping completed", data });
  } catch (error) {
    console.error("Crawl avatars error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
