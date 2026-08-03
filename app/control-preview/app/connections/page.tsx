import { Connections } from "@/components/member/connections";

/** Preview of the member connections screen — no auth boundary. */
export default function PreviewConnectionsPage() {
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
