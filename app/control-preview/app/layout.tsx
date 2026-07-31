import MemberLayout from "@/app/app/layout";

/**
 * Ungated preview of the member area.
 *
 * The real mount is /app, which middleware.ts gates — and that gate cannot
 * be satisfied yet, because sign-in needs Supabase and the project is
 * paused. Rather than add a bypass to shipped middleware so the screens can
 * be looked at, this mounts the same layout and the same pages on a path
 * the matcher does not cover. Nothing here is a copy: it re-exports.
 *
 * It is also what lets the device matrix cover these screens now instead of
 * after auth lands, which is the same reason /control-preview/admin exists.
 */
export default function MemberPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MemberLayout base="/control-preview/app">{children}</MemberLayout>;
}
