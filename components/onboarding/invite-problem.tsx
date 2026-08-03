import Link from "next/link";

/**
 * A link that did not work, explained.
 *
 * Three different problems for somebody holding a phone, and three different
 * things to do about them. Collapsing them into "invalid link" leaves them
 * stuck with no idea whether to ask Ben for a new one or just try again.
 */
export function InviteProblem({
  reason,
}: {
  reason: "malformed" | "tampered" | "expired";
}) {
  const copy = {
    expired: {
      title: "This link has expired",
      body: "Setup links last 30 days. Ask Ben for a new one and you'll be straight back in — nothing you filled in is lost.",
    },
    malformed: {
      title: "This link looks incomplete",
      body: "It may have been cut short when it was copied. Open it straight from the email or text Ben sent rather than pasting it.",
    },
    tampered: {
      title: "This link isn't valid",
      body: "It doesn't match anything we issued. Open the one from Ben's email or text — if that fails too, let him know.",
    },
  }[reason];

  return (
    <div className="ob">
      <header className="ob-top">
        <span className="ob-mark">
          SUTH<span className="ob-mark__dot">.</span>
        </span>
      </header>
      <main className="ob-main">
        <div className="ob-step">
          <h1 className="ob-title">{copy.title}</h1>
          <p className="ob-blurb">{copy.body}</p>
          <p className="ob-note">
            <Link href="/contact" className="ob-link">
              Get in touch
            </Link>{" "}
            and Ben will send another.
          </p>
        </div>
      </main>
    </div>
  );
}
