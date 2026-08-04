import { getDataMode } from "./source";

/**
 * Whether to say out loud that the data is synthetic.
 *
 * Demo mode normally labels itself in several places — a corner pill, a line on
 * every result page, a note on every generated report — because a leaderboard
 * that is not a record of a real race should say so to whoever reads it.
 *
 * A live presentation is the one case where that is wrong: the labels are about
 * the software rather than the sport, and they are the only thing on screen
 * that is. `NEXT_PUBLIC_HIDE_DEMO_PILL=1` turns them off for a deployment.
 *
 * ⚠️ Opt-in, and deliberately so. Unset — dev, CI, previews, anything nobody
 * remembered to configure — the labels appear. The failure mode of forgetting
 * is an over-labelled demo, not an unmarked one.
 *
 * This never affects indexing. The Results section is `noindex` whenever the
 * data mode is demo, whatever this returns, so synthetic results cannot reach
 * a search engine and be mistaken for a real archive by someone who never saw
 * the page in context.
 */
export function showDemoLabels(): boolean {
  if (getDataMode() === "live") return false;
  return process.env.NEXT_PUBLIC_HIDE_DEMO_PILL !== "1";
}
