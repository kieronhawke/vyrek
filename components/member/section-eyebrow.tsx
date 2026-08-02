export function SectionEyebrow({
  title,
  right,
}: {
  title: string;
  right?: string;
}) {
  return (
    <header className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="font-mono text-[12px] uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
        {title}
      </h2>
      {right ? (
        <span className="font-mono text-[12px] uppercase tracking-[0.22em] text-[color:var(--accent)]">
          {right}
        </span>
      ) : null}
    </header>
  );
}
