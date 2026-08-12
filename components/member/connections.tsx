import { PROVIDERS, isConnectable, isConfigured, STATUS_LABEL } from "@/lib/member/connections";

/**
 * CONNECTIONS.
 *
 * The rule this page is built on: a button only exists where a button works.
 *
 * The obvious version of this screen is six identical cards with six "Connect"
 * buttons. It would look complete and it would be a trap — three of those
 * providers cannot work from a website at all, so tapping would produce either
 * nothing or an error, and the athlete would conclude the app is broken rather
 * than that Apple does not let browsers read HealthKit.
 *
 * So each card states where it actually stands, and the ones that cannot
 * connect say why in one sentence instead of offering a control. That is a less
 * impressive-looking page and a much more useful one.
 *
 * The reasoning behind each status is in `lib/member/connections.ts`.
 */

export function Connections() {
  return (
    <div className="conn">
      <p className="conn__intro">
        Link an account and your training carries across automatically. No
        double entry. Where something is not here, it is because the provider
        does not allow it, and each one says which.
      </p>

      <ul className="conn__list" role="list">
        {PROVIDERS.map((p) => {
          const connectable = isConnectable(p);
          const ready = connectable && isConfigured(p.key);
          return (
            <li key={p.key} className="conn__card" data-status={p.status}>
              <div className="conn__head">
                <h3>{p.name}</h3>
                <span className="conn__status" data-status={p.status}>
                  {STATUS_LABEL[p.status]}
                </span>
              </div>

              <p className="conn__brings">{p.brings}</p>
              <p className="conn__note">{p.note}</p>

              {connectable ? (
                ready ? (
                  <a className="conn__button" href={`/api/member/connect/${p.key}`}>
                    Connect {p.name}
                  </a>
                ) : (
                  /*
                   * Deliberately disabled rather than hidden. Hiding it would
                   * make Strava look as impossible as Apple Health, when it is
                   * one config value away — and Ben should be able to see that
                   * distinction on the page rather than in a repo.
                   */
                  <p className="conn__pending">
                    Waiting on Strava API keys being added to the site settings.
                    Once they are in, this becomes a working button. No other
                    change needed.
                  </p>
                )
              ) : null}

              {p.docs ? (
                <a
                  className="conn__docs"
                  href={p.docs}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Read their developer terms
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
