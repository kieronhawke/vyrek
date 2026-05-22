import Link from "next/link";

export function Breadcrumb({
  trail,
}: {
  trail: { name: string; url: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
        {trail.map((step, i) => {
          const isLast = i === trail.length - 1;
          return (
            <li key={step.url} className="flex items-center gap-2">
              {isLast ? (
                <span aria-current="page" className="text-vyrek-text-secondary">
                  {step.name}
                </span>
              ) : (
                <>
                  <Link
                    href={step.url}
                    className="transition-colors hover:text-vyrek-text"
                  >
                    {step.name}
                  </Link>
                  <span aria-hidden>/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
