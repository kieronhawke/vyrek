import { NextResponse } from "next/server";
import { isBarcode, lookupBarcode } from "@/lib/member/off";

/**
 * One barcode in, one food out.
 *
 * Separate from search because the answer is different in kind: a barcode is
 * a question with exactly one right answer, and "not found" is a real and
 * useful reply that the sheet renders as "we do not have this one — add it
 * by hand" rather than as an empty list.
 */
export const runtime = "nodejs";

export async function GET(request: Request) {
  const code = (new URL(request.url).searchParams.get("code") ?? "").replace(/\D/g, "");

  if (!isBarcode(code)) {
    return NextResponse.json(
      { food: null, reason: "not-a-barcode" },
      { status: 400 },
    );
  }

  const food = await lookupBarcode(code);

  return NextResponse.json(
    { food, reason: food ? null : "unknown" },
    {
      headers: {
        // A barcode maps to the same product effectively forever.
        "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=2592000",
      },
    },
  );
}
