import { AdminShell } from "@/components/control/admin-shell";

/**
 * Operator Mode, on an ungated preview path.
 *
 * The real mount is /admin, which middleware.ts already gates. Building it
 * here first means the shell and every module are covered by the device
 * matrix and the axe gate *now*, instead of being unverifiable until auth
 * lands. The components are the same ones /admin will import; only the route
 * prefix differs.
 *
 * Fixtures only. No real client data reaches this path.
 */
export default function AdminPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

export { AdminShell };
