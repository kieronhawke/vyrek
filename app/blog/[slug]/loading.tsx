import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";

export default function BlogPostLoading() {
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <div className="h-3 w-48 animate-pulse rounded-full bg-vyrek-elevated" />

          <article className="mt-8">
            <header className="mx-auto max-w-3xl">
              <div className="h-3 w-32 animate-pulse rounded-full bg-vyrek-elevated" />
              <div className="mt-4 space-y-3">
                <div className="h-12 w-full animate-pulse rounded-lg bg-vyrek-elevated" />
                <div className="h-12 w-5/6 animate-pulse rounded-lg bg-vyrek-elevated" />
              </div>
              <div className="mt-5 space-y-2">
                <div className="h-4 w-full animate-pulse rounded-full bg-vyrek-elevated" />
                <div className="h-4 w-2/3 animate-pulse rounded-full bg-vyrek-elevated" />
              </div>
              <div className="mt-6 flex gap-3">
                <div className="size-7 animate-pulse rounded-full bg-vyrek-elevated" />
                <div className="h-4 w-48 animate-pulse rounded-full bg-vyrek-elevated" />
              </div>
            </header>

            <div className="mx-auto mt-10 aspect-[16/9] max-w-5xl animate-pulse rounded-lg bg-vyrek-elevated md:mt-14" />

            <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_minmax(0,720px)_1fr]">
              <aside className="lg:col-start-1">
                <div className="h-32 animate-pulse rounded-lg bg-vyrek-elevated" />
              </aside>
              <div className="lg:col-start-2">
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-4 w-full animate-pulse rounded-full bg-vyrek-elevated"
                      style={{ width: `${85 - (i % 3) * 12}%` }}
                    />
                  ))}
                </div>
                <div className="mt-10 h-9 w-1/2 animate-pulse rounded-lg bg-vyrek-elevated" />
                <div className="mt-4 space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-4 w-full animate-pulse rounded-full bg-vyrek-elevated"
                      style={{ width: `${90 - (i % 2) * 14}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </article>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
