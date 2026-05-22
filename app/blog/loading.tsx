import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";

/**
 * Skeleton loader for /blog. Matches the production layout's rhythm so the
 * page doesn't visibly reflow once the real content streams in.
 */
export default function BlogLoading() {
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <div className="h-3 w-40 animate-pulse rounded-full bg-vyrek-elevated" />
          <div className="mt-6 space-y-3">
            <div className="h-3 w-48 animate-pulse rounded-full bg-vyrek-elevated" />
            <div className="h-12 w-3/4 animate-pulse rounded-lg bg-vyrek-elevated" />
            <div className="h-12 w-2/3 animate-pulse rounded-lg bg-vyrek-elevated" />
            <div className="mt-4 h-4 w-full max-w-2xl animate-pulse rounded-full bg-vyrek-elevated" />
            <div className="h-4 w-3/4 max-w-2xl animate-pulse rounded-full bg-vyrek-elevated" />
          </div>

          <div className="mt-14 grid gap-3 overflow-hidden rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated md:grid-cols-2">
            <div className="aspect-[16/10] animate-pulse bg-vyrek-overlay" />
            <div className="space-y-3 p-6 md:p-8">
              <div className="h-3 w-32 animate-pulse rounded-full bg-vyrek-overlay" />
              <div className="h-8 w-full animate-pulse rounded-md bg-vyrek-overlay" />
              <div className="h-8 w-3/4 animate-pulse rounded-md bg-vyrek-overlay" />
              <div className="h-4 w-full animate-pulse rounded-full bg-vyrek-overlay" />
              <div className="h-4 w-2/3 animate-pulse rounded-full bg-vyrek-overlay" />
            </div>
          </div>

          <ul
            role="list"
            className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="overflow-hidden rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated"
              >
                <div className="aspect-[16/10] animate-pulse bg-vyrek-overlay" />
                <div className="space-y-3 p-5">
                  <div className="h-3 w-24 animate-pulse rounded-full bg-vyrek-overlay" />
                  <div className="h-5 w-full animate-pulse rounded-md bg-vyrek-overlay" />
                  <div className="h-5 w-3/4 animate-pulse rounded-md bg-vyrek-overlay" />
                  <div className="h-3 w-full animate-pulse rounded-full bg-vyrek-overlay" />
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
