import { NextResponse } from "next/server";
import { getAssetCatalog } from "@/lib/asset-catalog";

export async function GET() {
  try {
    const catalog = getAssetCatalog(process.cwd());
    return NextResponse.json(catalog, { status: 200 });
  } catch (error) {
    console.error("Failed to load asset catalog:", error);
    return NextResponse.json({ error: "Failed to load asset catalog" }, { status: 500 });
  }
}
