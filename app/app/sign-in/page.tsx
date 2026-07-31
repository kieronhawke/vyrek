import { Num } from "@/components/control/num";

/**
 * SIGN IN.
 *
 * Deliberately email-only. spec/11 §9 asks for an app-like feel, and the
 * least app-like thing on the web is being asked to invent a password on a
 * phone. A link removes the field, the forgotten-password branch, and the
 * "must contain a symbol" argument in one go.
 *
 * NOT WIRED. Supabase is paused and the passwordless flow needs the auth
 * rewrite recorded in QUESTIONS.md. The form is disabled rather than
 * pretending to work, because a login box that silently does nothing is
 * worse than one that says why.
 */
export default function SignInPage() {
  return (
    <div
      style={{
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        maxWidth: 420,
        margin: "0 auto",
      }}
    >
      <p className="eyebrow">Suth Performance</p>
      <h1
        style={{
          fontSize: "var(--text-2xl)",
          lineHeight: "var(--text-2xl-lh)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          margin: "var(--space-1) 0 var(--space-1)",
        }}
      >
        Welcome back
      </h1>
      <p
        style={{
          margin: "0 0 var(--space-4)",
          color: "var(--text-muted)",
          fontSize: "var(--text-base)",
        }}
      >
        We&apos;ll email you a link. No password to remember.
      </p>

      <label
        htmlFor="signin-email"
        className="eyebrow"
        style={{ marginBottom: 6, display: "block" }}
      >
        Email
      </label>
      <input
        id="signin-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="off"
        placeholder="you@email.com"
        disabled
        style={{
          width: "100%",
          minHeight: 56,
          padding: "0 var(--space-2)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-input)",
          color: "var(--text)",
          fontSize: "var(--text-base)",
        }}
      />

      <button
        type="button"
        disabled
        style={{
          width: "100%",
          minHeight: 56,
          marginTop: "var(--space-2)",
          background: "var(--accent)",
          color: "#0A0A0A",
          border: "none",
          borderRadius: "var(--radius-button)",
          fontSize: "var(--text-lg)",
          fontWeight: 700,
          opacity: 0.4,
          cursor: "not-allowed",
        }}
      >
        Email me a link
      </button>

      <p
        style={{
          marginTop: "var(--space-2)",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
        }}
      >
        Sign-in is not connected yet: it needs the database and the
        passwordless auth change in QUESTIONS.md §19. Disabled rather than
        pretending to work.
      </p>

      <p
        style={{
          marginTop: "var(--space-4)",
          fontSize: "var(--text-sm)",
          color: "var(--text-faint)",
        }}
      >
        Trouble getting in? Reply to any email from Ben and a person will
        sort it. Usually within{" "}
        <Num align="left">1</Num> working day.
      </p>
    </div>
  );
}
