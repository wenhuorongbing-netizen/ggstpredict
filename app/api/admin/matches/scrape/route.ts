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
      return NextResponse.json({ error: errorData.detail || "Scraping failed" }, { status: scrapeRes.status });
    }

    const data = await scrapeRes.json();
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error("Scraper bridge error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
