import type { Metadata } from "next";
import { PlanReveal } from "@/components/plan/plan-reveal";

export const metadata: Metadata = {
  title: "Your plan",
  description:
    "Your personalised Hyrox plan. Week 1 dated and visible, Weeks 2-12 unlock with membership.",
};

export default function PlanPage() {
  return <PlanReveal variant="owner" />;
}
