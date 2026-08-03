import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/lib/blog/jsonld";
import { UsStatePage } from "@/components/landing/us-state-page";
import { getUsState, listUsStateSlugs } from "@/lib/us-states";
import { getLocationBySlug } from "@/lib/uk-locations";
import {
  stateServiceJsonLd,
  stateFaqJsonLd,
  stateBreadcrumbJsonLd,
  stateDescription,
} from "@/lib/us-state-jsonld";
import { siteUrl } from "@/lib/blog/urls";

/**
 * A US state page. Sibling of the other funnel's; see
 * components/landing/us-state-page.tsx for why a state gets its own template
 * rather than reusing the town one.
 */
export const revalidate = 86400;
export const dynamicParams = false;

export async function generateStaticParams() {
  return listUsStateSlugs().map((state) => ({ state }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const { state } = await params;
  const s = getUsState(state);
  if (!s) return { title: "Not found" };
  const url = `${siteUrl()}/personal-trainer/state/${s.slug}`;
  // layout.tsx appends " · Suth Performance" (20 chars). Every state name fits
  // inside 65 with the prefix below; the longest is District of Columbia.
  /* Washington the US state and Washington in Tyne and Wear produced the
     same title on two live URLs. Any state whose slug a town already owns
     carries the country, so the two never compete. */
  const collides = Boolean(getLocationBySlug(s.slug));
  const title = collides
    ? `Personal trainer in ${s.name}, United States`
    : `Personal trainer in ${s.name}`;
  return {
    title,
    description: stateDescription("pt", s),
    alternates: { canonical: url },
    openGraph: {
      title,
      description: stateDescription("pt", s),
      url,
      siteName: "Suth Performance",
      type: "website",
      locale: "en_US",
      images: [{ url: "/media/images/track/og-default.jpg", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description: stateDescription("pt", s) },
    robots: { index: true, follow: true },
  };
}

export default async function PersonalTrainerStatePage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  const s = getUsState(state);
  if (!s) notFound();
  return (
    <>
      <JsonLd data={stateFaqJsonLd("pt", s)} />
      <JsonLd data={stateServiceJsonLd("pt", s)} />
      <JsonLd data={stateBreadcrumbJsonLd("pt", s)} />
      <UsStatePage variant="pt" state={s} />
    </>
  );
}
