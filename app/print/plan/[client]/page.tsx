import type { Metadata } from "next";
import "@/app/print.css";
import { PrintablePlan } from "@/components/export/printable-plan";

/**
 * The plan, laid out for paper.
 *
 * WHY THIS RATHER THAN A PDF LIBRARY
 * ----------------------------------
 * Generating a PDF on the server needs either a headless Chrome binary — which
 * does not exist on Vercel without a serverless-chromium package — or a
 * drawing library, where every line of type is positioned by hand and the
 * result is worse than a web page. A print stylesheet uses the renderer that
 * is already there, produces a real vector PDF through the browser's own
 * "Save as PDF", and works identically on a phone.
 *
 * So this page is not a preview of a PDF. It *is* the PDF, before printing.
 */
export const metadata: Metadata = {
  title: "Training plan",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PrintPlanPage({
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

  return <PrintablePlan athlete={athlete} />;
}
