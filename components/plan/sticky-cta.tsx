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
        {loading ? (
          <>
            <Spinner />
            <span>One moment</span>
          </>
        ) : (
          <span>Start training. 7 days free →</span>
        )}
      </button>
      <p className="mt-2 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
        <svg
          aria-hidden
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>Cancel anytime · Secure checkout via Stripe</span>
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}
