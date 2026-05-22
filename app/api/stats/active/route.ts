import { NextResponse } from "next/server";
import { getActiveStats } from "@/lib/stats";

// 5min cache per brief §25.
export const revalidate = 300;

export async function GET() {
  return NextResponse.json(getActiveStats(), {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
