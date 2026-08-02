import { permanentRedirect } from "next/navigation";

/** Sprint 1 route. Event pages now live at /event/{slug} — see DECISIONS.md D7. */
export default async function LegacyEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<never> {
  const { slug } = await params;
  permanentRedirect(`/event/${slug}`);
}
