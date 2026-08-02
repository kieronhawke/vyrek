import { notFound } from "next/navigation";
import { assertMember } from "@/lib/member/auth";
import { findDay } from "@/lib/member/week";
import { SessionScreen } from "@/components/member/screens/session-screen";

/** One session. `day` is a date slug, 2026-08-05. */
export default async function SessionPage({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  await assertMember("/app/plan");
  const { day: slug } = await params;
  const day = findDay(slug);
  // Only the current week is programmed, so anything else is a 404 rather
  // than an invented session.
  if (!day) notFound();
  return <SessionScreen day={day} />;
}
