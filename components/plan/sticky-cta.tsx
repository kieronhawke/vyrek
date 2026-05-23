"use client";

export function StickyCta({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <div className="sticky bottom-0 left-0 right-0 z-30 border-t border-vyrek-border-subtle bg-vyrek-base/95 px-5 pb-[max(0.75rem,var(--safe-bottom))] pt-3 backdrop-blur-md">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-pill bg-vyrek-accent px-6 text-base font-medium tracking-tight text-[#0A0A0A] transition-[background,opacity,transform] duration-fast ease-out hover:bg-vyrek-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "One moment...": "Start training. 7 days free →"}
      </button>
    </div>
  );
}
