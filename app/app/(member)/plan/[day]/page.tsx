import { notFound } from "next/navigation";
import { assertFullMember } from "@/lib/member/auth";
import { findDay } from "@/lib/member/week";
import { SessionScreen } from "@/components/member/screens/session-screen";

/** One session. `day` is a date slug, 2026-08-05. */
export default async function SessionPage({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  await assertFullMember("/app/plan");
  const { day: slug } = await params;
  const day = findDay(slug);
  // Only the current week is programmed, so anything else is a 404 rather
  // than an invented session.
  if (!day) notFound();
  return <SessionScreen day={day} />;
}
