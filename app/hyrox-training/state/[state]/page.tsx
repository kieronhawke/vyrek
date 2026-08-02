import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/lib/blog/jsonld";
import { UsStatePage } from "@/components/landing/us-state-page";
import { getUsState, listUsStateSlugs } from "@/lib/us-states";
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
  const url = `${siteUrl()}/hyrox-training/state/${s.slug}`;
  // layout.tsx appends " · Suth Performance" (20 chars). Every state name fits
  // inside 65 with the prefix below; the longest is District of Columbia.
  const title = `Hyrox training in ${s.name}`;
  return {
    title,
    description: stateDescription("hyrox", s),
    alternates: { canonical: url },
    openGraph: {
      title,
      description: stateDescription("hyrox", s),
      url,
      siteName: "Suth Performance",
      type: "website",
      locale: "en_US",
      images: [{ url: "/media/images/track/og-default.jpg", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description: stateDescription("hyrox", s) },
    robots: { index: true, follow: true },
  };
}

export default async function HyroxTrainingStatePage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  const s = getUsState(state);
  if (!s) notFound();
  return (
    <>
      <JsonLd data={stateFaqJsonLd("hyrox", s)} />
      <JsonLd data={stateServiceJsonLd("hyrox", s)} />
      <JsonLd data={stateBreadcrumbJsonLd("hyrox", s)} />
      <UsStatePage variant="hyrox" state={s} />
    </>
  );
}
