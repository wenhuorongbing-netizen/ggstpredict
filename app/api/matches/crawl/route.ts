import { NextResponse } from "next/server";

export async function POST() {
  try {
    const res = await fetch("http://localhost:5000/crawl", {
      method: "GET",
      // Add standard headers just in case
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Bot responded with status: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("Crawl Proxy Error:", error);
    return NextResponse.json(
      { error: "Failed to connect to the crawler service" },
      { status: 500 }
    );
  }
}
