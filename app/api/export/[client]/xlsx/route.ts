import { NextResponse } from "next/server";
import { planFilename, planWorkbook } from "@/lib/export/plan-xlsx";
import { SEED_WEEK, type PlanWeek } from "@/lib/plan/model";

/**
 * The week as a branded .xlsx.
 *
 * POST carries the week, because the plan lives in the operator's browser
 * until there is a database — the client sends what it has. GET falls back to
 * the seed so the route is testable and a link always produces a file.
 */
export const dynamic = "force-dynamic";

function build(week: PlanWeek, athlete: string) {
  const bytes = planWorkbook(week, athlete);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${planFilename(week, athlete)}"`,
      "Cache-Control": "no-store",
    },
  });
}

function nameFrom(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() + p.slice(1))
    .join(" ");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ client: string }> },
) {
  const { client } = await params;
  return build(SEED_WEEK, nameFrom(client));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ client: string }> },
) {
  const { client } = await params;
  let week: PlanWeek = SEED_WEEK;
  try {
    const body = (await req.json()) as { week?: PlanWeek };
    if (body?.week?.days?.length === 7) week = body.week;
  } catch {
    // Malformed body: fall back to the seed rather than 500 on a download.
  }
  return build(week, nameFrom(client));
}
