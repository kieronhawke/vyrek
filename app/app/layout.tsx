import type { Metadata } from "next";
import { assertMember } from "@/lib/member/auth";
import { MemberShell } from "@/components/member/shell";

export const metadata: Metadata = {
  title: "Today. Vyrek",
  description:
    "Your Hyrox training plan, today's session, food log, and race tracker.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await assertMember();
  return <MemberShell ctx={ctx}>{children}</MemberShell>;
}
