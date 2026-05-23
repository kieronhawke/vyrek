export function SectionEyebrow({
  title,
  right,
}: {
  title: string;
  right?: string;
}) {
  return (
    <header className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
        {title}
      </h2>
      {right ? (
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-accent">
          {right}
        </span>
      ) : null}
    </header>
  );
}
