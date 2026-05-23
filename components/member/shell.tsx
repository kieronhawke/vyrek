import type { ReactNode } from "react";
import { MemberBottomNav } from "@/components/member/bottom-nav";
import { MemberTopBar } from "@/components/member/top-bar";
import type { MemberContext } from "@/lib/member/auth";

export function MemberShell({
  ctx,
  children,
}: {
  ctx: MemberContext;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-vyrek-base text-vyrek-text">
      <MemberTopBar email={ctx.user.email} />
      <main
        className="flex-1 pb-[calc(5.5rem+var(--safe-bottom))] md:pb-12"
        // pb to keep content above the fixed bottom-tab on mobile.
      >
        {children}
      </main>
      <MemberBottomNav />
    </div>
  );
}
