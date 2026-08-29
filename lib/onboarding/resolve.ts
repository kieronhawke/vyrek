import {
  readInvite,
  validAmountPence,
  validStartDay,
  type InviteResult,
} from "./token";
import { loadInvite, looksLikeInviteId } from "./invite-store";

/**
 * ONE DOOR, TWO KINDS OF KEY.
 *
 * `/o/{something}` now accepts two things:
 *
 *   • a **short id** — ten characters, the payload lives in Redis
 *   • a **signed token** — the whole invite inside the URL, 225 characters
 *
 * Short ids are what we mint. Signed tokens are what is already sitting in
 * people's text messages, and those have to keep working: an athlete who was
 * invited last week and opens the link today must not meet an error page
 * because we changed how links are made.
 *
 * The two are told apart by shape rather than by trying one and catching the
 * other. A short id is exactly ten characters from a known alphabet and can
 * never contain the `.` that separates a token from its signature, so the test
 * is unambiguous and cheap.
 *
 * Expiry is still enforced on the payload itself, not just by the store's TTL.
 * A store TTL is a cleanup mechanism, not an authorisation one, and a resolver
 * that trusted it would hand out an expired invite the moment a TTL was set
 * wrong.
 *
 * ⚠️ AND SO ARE THE MONEY FIELDS. The signed-token path bounds-checks the rate
 * and the start date on the way out — deliberately, because a signature proves
 * nobody edited a value and says nothing about whether it was sane when it was
 * written. The stored path returned its payload verbatim and skipped all of
 * that, so the two doors into the same flow had different standards.
 *
 * That is not theoretical. A row carrying `amountPence: 9999999` resolved
 * cleanly and Checkout was asked for £99,999.99 a month — a figure Ben's form
 * and the invite API both refuse. Anything that can write to the store, now or
 * later, would have inherited the right to name a price. Both doors check.
 */
export async function resolveInvite(
  tokenOrId: string,
  now = Date.now(),
): Promise<InviteResult> {
  if (looksLikeInviteId(tokenOrId)) {
    const invite = await loadInvite(tokenOrId);
    // An id we cannot resolve is not "tampered" — nothing was forged. It has
    // been used up, expired out of the store, or was mistyped, and "expired"
    // is the message that tells somebody to ask Ben for a new one.
    if (!invite) return { ok: false, reason: "expired" };
    if (!invite.exp || invite.exp * 1000 < now) {
      return { ok: false, reason: "expired" };
    }

    /* Dropped rather than refused, exactly as the token reader does it. A
       nonsense rate falls back to the plan's published price and a nonsense
       date falls back to charging at checkout — both are recoverable, and
       both are better than either charging the nonsense or leaving somebody
       staring at an error they cannot do anything about. */
    return {
      ok: true,
      invite: {
        ...invite,
        ...(validAmountPence(invite.amountPence)
          ? {}
          : { amountPence: undefined }),
        ...(validStartDay(invite.startDay) ? {} : { startDay: undefined }),
      },
    };
  }

  return readInvite(tokenOrId, now);
}
