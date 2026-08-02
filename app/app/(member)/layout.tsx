import { MemberShell } from "@/components/member/shell";
import { RegisterTrainSW } from "@/components/client-app/register-sw";
import { assertMember } from "@/lib/member/auth";

/**
 * The tabbed member area. Everything under here is signed in and framed.
 *
 * The gate is here rather than repeated in each page so a new page cannot be
 * added ungated by accident, and so the shell can show who is signed in
 * without every page re-querying for it.
 */
export const dynamic = "force-dynamic";

function initialsFor(email: string): string {
  const local = email.replace(/@.*/, "");
  const parts = local.split(/[\W_]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return letters.join("") || "S";
}

export default async function MemberTabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await assertMember("/app/today");

  return (
    <>
      <RegisterTrainSW />
      <MemberShell initials={initialsFor(ctx.user.email)}>{children}</MemberShell>
    </>
  );
}
