import type { Metadata } from "next";
import "@/app/print-v2.css";
import { PrintablePlanV2 } from "@/components/export/printable-plan-v2";

/**
 * The designed plan — version 2.
 *
 * v1 lives at /print/plan/[client] and is kept deliberately: it is the
 * ink-saver, black on white, seven columns, one page. This is the one to send:
 * branded masthead, day cards two-up, an icon and a set quantity on every
 * line.
 *
 * Still a print stylesheet rather than a generated PDF — see app/print-v2.css.
 */
export const metadata: Metadata = {
  title: "Training plan",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PrintPlanV2Page({
  params,
}: {
  params: Promise<{ client: string }>;
}) {
  const { client } = await params;
  const athlete = client
    .split("-")
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() + p.slice(1))
    .join(" ");

  return <PrintablePlanV2 athlete={athlete} />;
}
