import type { Metadata } from "next";
import { assertMember } from "@/lib/member/auth";
import { Connections } from "@/components/member/connections";

export const metadata: Metadata = { title: "Connections" };

/** CONNECTIONS — auth boundary only. */
export default async function MemberConnectionsPage() {
  await assertMember("/app/connections");
  return (
    <>
      <p className="eyebrow">Account</p>
      <h1
        style={{
          fontSize: "var(--text-2xl)",
          lineHeight: 1.1,
          fontWeight: 800,
          letterSpacing: "-0.025em",
          margin: "var(--space-1) 0 var(--space-3)",
        }}
      >
        Connections
      </h1>
      <Connections />
    </>
  );
}
