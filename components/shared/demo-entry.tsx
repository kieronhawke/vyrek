import Link from "next/link";

/**
 * One-click entry to the screens, without an account.
 *
 * WHY THIS IS NOT A REAL SIGN-IN
 * ------------------------------
 * Kieron asked for a demo button that "logs me straight in". It cannot, and
 * not because of caution: there is no auth backend to log into. Supabase has a
 * URL configured but neither the anon key nor the service-role key, so
 * `supabaseServer()` cannot mint a session for anyone, demo or otherwise.
 *
 * Even once those keys exist, the thing to avoid is a button on a publicly
 * reachable login page that puts anyone into the admin. suthperformance.com is
 * noindex, not private.
 *
 * So these route to the ungated preview mounts, which render the same screen
 * components behind the same shell as the real ones — the only difference is
 * the auth boundary. For reviewing the product, which is what was asked for,
 * they are the same thing.
 *
 * When Supabase is connected, the honest version of a real demo login is a
 * seeded demo account plus an env flag that only exists outside production.
 */
export function DemoEntry({
  variant,
}: {
  /** Which login page this is sitting on. */
  variant: "member" | "admin";
}) {
  const links =
    variant === "admin"
      ? [
          { href: "/control-preview/admin", label: "Open the admin" },
          { href: "/review", label: "Every screen" },
        ]
      : [
          { href: "/control-preview/app/today", label: "Open the member area" },
          { href: "/review", label: "Every screen" },
        ];

  return (
    <div className="mt-10 rounded-lg border border-suth-border bg-suth-elevated p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
        Demo
      </p>
      <p className="mt-2 text-sm leading-relaxed text-suth-text-secondary">
        {variant === "admin"
          ? "Look round the admin without an account."
          : "Look round the member area without an account."}{" "}
        Sample data, nothing saves.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {links.map((l, i) => (
          <Link
            key={l.href}
            href={l.href}
            className={
              i === 0
                ? "inline-flex min-h-12 items-center rounded-full bg-suth-accent px-5 text-sm font-bold text-suth-base"
                : "inline-flex min-h-12 items-center rounded-full border border-suth-border px-5 text-sm font-semibold text-suth-text"
            }
          >
            {l.label}
          </Link>
        ))}
      </div>
      <p className="mt-3 text-xs text-suth-text-tertiary">
        Real sign-in needs Supabase keys, which are not set yet.
      </p>
    </div>
  );
}
