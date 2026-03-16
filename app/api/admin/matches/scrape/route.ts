import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    // Call the Python microservice
    const scrapeRes = await fetch("http://localhost:8000/scrape-bracket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!scrapeRes.ok) {
      const errorData = await scrapeRes.json();
      try {
        const { prisma } = await import("@/lib/prisma");
        await prisma.adminLog.create({
          data: {
            action: "PYTHON_SCRAPE_ERROR",
            details: `Scraper Error: ${scrapeRes.status} ${errorData.detail || "Unknown"}`
          }
        });
      } catch (logError) {}
      return NextResponse.json({ error: errorData.detail || "Scraping failed" }, { status: scrapeRes.status });
    }

    const data = await scrapeRes.json();
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.adminLog.create({
        data: {
          action: "PYTHON_SCRAPE",
          details: `Python 抓取成功 (URL: ${url}), 抓取 ${data.matches ? data.matches.length : 0} 场比赛`
        }
      });
    } catch (logError) {}
    return NextResponse.json(data, { status: 200 });

  } catch (error: any) {
    console.error("Scraper bridge error:", error);
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.adminLog.create({
        data: {
          action: "PYTHON_SCRAPE_ERROR",
          details: `Scraper Bridge Error: ${error.message || "Unknown error"}`
        }
      });
    } catch (logError) {}
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
