import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "Missing URL" }, { status: 400 });
    }

    const res = await fetch("http://localhost:8000/crawl", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      throw new Error(`Bot responded with status: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err: unknown) {
    const error = err as any;
    console.error("Crawl Proxy Error:", error);
    return NextResponse.json(
      { error: "Failed to connect to the crawler service" },
      { status: 500 }
    );
  }
}
