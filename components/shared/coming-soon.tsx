import Link from "next/link";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";

export function ComingSoon({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center py-24">
      <Container>
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <Eyebrow>{eyebrow}</Eyebrow>
          <SplitHeading
            as="h1"
            className="mt-4 text-3xl font-black leading-tight tracking-[-0.05em] text-vyrek-text md:text-4xl"
          >
            {title}
          </SplitHeading>
          <p className="mt-5 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
            {description}
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex h-11 items-center text-sm text-vyrek-text-secondary underline-offset-4 hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </Container>
    </main>
  );
}
