import { redirect } from "next/navigation";

/**
 * /app has no screen of its own.
 *
 * It used to: a second home page, built on a different fixture set and a
 * different token system to /app/today, showing a greeting, a coach note and
 * a week of dots. /app/today showed a greeting, a race countdown, the session,
 * training load, the week and the community feed. Two homes, one of them
 * reachable only by the wordmark, disagreeing about what "home" meant.
 *
 * /app/today won: it is the one the tab bar points at, the one behind the auth
 * gate, and the richer of the two. This is the redirect that retires the other.
 */
export default function MemberIndex() {
  redirect("/app/today");
}
