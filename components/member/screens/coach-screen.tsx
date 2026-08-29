import { CoachThread } from "@/components/member/coach-thread";
import { CoachIntro } from "@/components/member/coach-intro";
import { BEN_PHOTOS, pickPhoto } from "@/lib/photo-library";

/**
 * ASK BEN.
 *
 * The screen is the thread. It used to be a heading, a card explaining that
 * most of the people Ben coaches have never finished anything, a second
 * heading, and then the conversation — so on a phone the actual messages
 * started below the fold, and the first thing an athlete read every single
 * morning was a paragraph about other people failing to stick at things.
 *
 * That paragraph is true and worth saying once, to somebody deciding whether
 * to send a first message. It is not worth saying on visit forty. It is now a
 * prompt above the composer that can be dismissed and does not come back.
 */
export function CoachScreen({
  firstName = "there",
  email = "",
  phone = "",
}: {
  firstName?: string;
  email?: string;
  phone?: string;
}) {
  const portrait = pickPhoto(BEN_PHOTOS, "coach-thread");

  return (
    <div className="coachpage">
      {/* Ben's face at the top of his own thread, the way every messaging app
          puts the other person there. */}
      <header className="coachpage__head">
        <span className="coachpage__avatar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={portrait.src} alt="" />
        </span>
        <span className="coachpage__who">
          <span className="coachpage__name">Ben Sutherland</span>
          <span className="coachpage__sub">
            Your coach · usually replies within a day
          </span>
        </span>
      </header>

      <CoachIntro />

      <CoachThread
        coachPhoto={portrait}
        firstName={firstName}
        email={email}
        phone={phone}
      />
    </div>
  );
}
