import { MemberShell } from "@/components/member/shell";
import "@/app/control-tokens.css";
import "@/app/member.css";

/**
 * Faithful preview of the member area before anything is published.
 *
 * Separate from /control-preview/app because that mount deliberately shows a
 * populated block, and the whole point of this one is the opposite. It
 * passes blockWeek={0}, which is what the real member layout passes for a
 * member with nothing published, so the chrome here matches what a customer
 * actually sees: no "Week 4 of 12" ring and no five-step walkthrough over
 * the top of a screen that has nothing to tour.
 */
export default function FirstRunPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-surface="control"
      data-density="comfortable"
      style={{ minHeight: "100svh" }}
    >
      <MemberShell base="/control-preview/app" initials="SP" blockWeek={0}>
        {children}
      </MemberShell>
    </div>
  );
}
