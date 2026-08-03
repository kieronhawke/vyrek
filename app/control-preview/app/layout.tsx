import { MemberShell } from "@/components/member/shell";
import "@/app/control-tokens.css";
import "@/app/member.css";
import { ThemeScript } from "@/components/control/theme-script";

/**
 * Ungated preview of the member area.
 *
 * The real mount is /app, gated by middleware.ts, and that gate cannot be
 * satisfied until Supabase is connected. Rather than add a bypass to shipped
 * auth so the screens can be looked at, this mounts the same shell and the
 * same screen components on a path the matcher does not cover.
 *
 * It used to re-export the pages themselves, which call assertMember and
 * therefore redirected straight to /login — so the preview could not preview
 * the thing it exists to preview. It now renders the screens, which is the
 * same markup without the auth boundary.
 */
export default function MemberPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-surface="control"
      // ThemeScript sets data-theme here before paint.
      suppressHydrationWarning
      data-density="comfortable"
      style={{ minHeight: "100svh" }}
    >
      <ThemeScript />
      <MemberShell base="/control-preview/app" initials="SP">
        {children}
      </MemberShell>
    </div>
  );
}
