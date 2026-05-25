import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanReveal } from "@/components/plan/plan-reveal";
import { StripeCancellationCapture } from "@/components/plan/stripe-cancellation-capture";

export const metadata: Metadata = {
  title: "Your plan",
  description:
    "Your personalised Hyrox plan. Week 1 dated and visible, Weeks 2-12 unlock with membership.",
  alternates: { canonical: "/plan" },
};

export default function PlanPage() {
  return (
    <>
      <PlanReveal variant="owner" />
      <Suspense fallback={null}>
        <StripeCancellationCapture />
      </Suspense>
    </>
  );
}
