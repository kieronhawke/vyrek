import { notFound } from "next/navigation";
import { findDay } from "@/lib/member/week";
import { SessionScreen } from "@/components/member/screens/session-screen";

export const dynamic = "force-dynamic";

export default async function SessionPreview({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  const { day: slug } = await params;
  const day = findDay(slug);
  if (!day) notFound();
  return <SessionScreen day={day} base="/control-preview/app" />;
}
