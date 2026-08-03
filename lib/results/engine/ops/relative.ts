/**
 * `relative` — human-readable "time since" for the operator console.
 *
 * Extracted from ops/console.ts on 2026-08-03 to unbreak the production build.
 *
 * components/admin/results-engine/console.tsx is a "use client" component and
 * imported this as a *value* from ops/console.ts. That module imports the
 * engine index, the fetcher and the Supabase client, which transitively reach
 * lib/results/demo-source.ts and its `import "node:fs"`. Turbopack cannot put
 * node:fs in a client chunk, so every production deploy failed with:
 *
 *   the chunking context (unknown) does not support external modules
 *   (request: node:fs)
 *
 * Six consecutive deploys from main errored before this was spotted, because
 * the failure is a bundling error rather than a type error and does not show
 * up in tests or in `next dev`.
 *
 * The function is pure date arithmetic with no imports, so it lives here and
 * ops/console.ts re-exports it. Server callers are unaffected; the client now
 * pulls one small module instead of the whole engine.
 *
 * Rule of thumb this encodes: a "use client" component must never take a value
 * import from a module that touches the repository, the fetcher or the
 * filesystem. Types are free (`import type` is erased); values are not.
 */
export function relative(
  iso: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!iso) return "never";
  const deltaMs = now.getTime() - new Date(iso).getTime();
  if (deltaMs < 0) return "just now";
  const seconds = Math.floor(deltaMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
