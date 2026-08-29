import { MEMBER_PROVIDERS } from "@/lib/member/connections";

/**
 * CONNECTIONS, AS THE MEMBER SEES IT.
 *
 * WHAT THIS PAGE USED TO SAY
 * --------------------------
 * "Strava's API is open and free, so this is the one integration that can work
 * today." "Waiting on Strava API keys, and on somewhere to store the
 * connection." "MyFitnessPal's API is partner-only and they are not accepting
 * new applications." "Google retired the Fit web API in favour of Health
 * Connect." Plus a "Read their developer terms" link on every card.
 *
 * All of that is true, all of it is useful, and none of it is the member's
 * business. It is our roadmap and our blockers, printed on the screen somebody
 * opened to find out whether their watch will sync.
 *
 * WHAT IT SAYS NOW
 * ----------------
 * Which services are coming and what each will bring across. The reasoning —
 * which API is open, which needs a phone app, which is closed to us — stays in
 * lib/member/connections.ts, where the operator side reads it. Nothing was
 * deleted; it stopped being shown to the wrong audience.
 *
 * The Connect button went with it. It is not lost either: the OAuth route it
 * pointed at still exists, and the card grows a button again the day there is
 * somewhere to keep the tokens the callback returns. Offering it now would be
 * the old lie in a new layout.
 *
 * ON THE MARKS
 * ------------
 * These are the providers' brand colours with their names set in our own type,
 * not their logos. We hold no licensed logo files, and an approximated Strava
 * or WHOOP mark is a trademark problem as well as looking worse than not
 * trying. Drop real asset files in and the mark becomes an <img> without the
 * layout changing.
 *
 * ON THE COPY
 * -----------
 * No em-dashes in anything a client reads. That is the house rule from the
 * copy pass, and it applies to this rebuild's sentences too — full stops do
 * the same work without the typographic tic.
 */
export function Connections() {
  return (
    <div className="conn">
      <p className="conn__intro">
        Connect an app and your training carries across on its own. No logging
        the same session twice. None of these are live yet; they are listed in
        the order they are being built.
      </p>

      <ul className="conn__list" role="list">
        {MEMBER_PROVIDERS.map((p) => (
          <li key={p.key} className="conn__card">
            <div className="conn__head">
              <span
                className="conn__mark"
                style={{ background: p.colour, color: p.ink }}
                aria-hidden
              >
                {p.initials}
              </span>
              <h3 className="conn__name">{p.name}</h3>
              <span className="conn__soon">Coming soon</span>
            </div>
            <p className="conn__brings">{p.brings}</p>
          </li>
        ))}
      </ul>

      <p className="conn__foot">
        Until these are live, log your sessions in the app. Ben sees everything
        he needs.
      </p>
    </div>
  );
}
