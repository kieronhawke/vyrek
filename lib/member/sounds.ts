/**
 * THE TWO SOUNDS THE CHAT MAKES.
 *
 * Kieron asked for sound effects, and a chat is the one screen where they
 * genuinely help: sending and receiving are the same visual event from two
 * feet away, and the ear tells them apart instantly. Every messaging app
 * anybody uses does this, and the reason is not decoration.
 *
 * WHY SYNTHESISED RATHER THAN AUDIO FILES
 * Two MP3s is two network requests, two things to host, and a first play that
 * arrives after the animation it belongs to. The Web Audio API makes these
 * from an oscillator and a gain ramp in about thirty lines, with nothing to
 * download and no delay on the first one.
 *
 * WHAT MAKES A CHAT SOUND CHEAP
 * ------------------------------
 * Length and volume. These are 90 and 150 milliseconds at a tenth of full
 * gain — closer to a tap than a chime. The send is a short rise, the reply is
 * a two-note fall, which is the convention in every app for a reason: rising
 * reads as "gone", falling reads as "arrived".
 *
 * THE PART THAT IS NOT OPTIONAL
 * -----------------------------
 *   - Nothing plays until the member has interacted with the page. Browsers
 *     block it anyway, but the point is that a training app should never make
 *     a noise in a quiet room nobody asked it to.
 *   - `prefers-reduced-motion` silences it. The setting is named for motion,
 *     but it is the closest signal a browser gives for "stop doing extra",
 *     and people who set it do not want a surprise noise either.
 *   - It is a preference, off-switchable, and failure is silent. An
 *     AudioContext can be refused for a dozen reasons and none of them are
 *     worth an error message about a beep.
 */

export const SOUND_KEY = "member.sound.v1";

export type Cue = "send" | "receive";

/* Deliberately quiet. A notification at full gain in a gym changing room is
   how somebody ends up turning sound off for good. */
const GAIN = 0.1;

type Note = { hz: number; at: number; for: number };

/** Rising: it left. Falling pair: it arrived. */
const CUES: Record<Cue, Note[]> = {
  send: [{ hz: 660, at: 0, for: 0.09 }],
  receive: [
    { hz: 740, at: 0, for: 0.08 },
    { hz: 560, at: 0.07, for: 0.1 },
  ],
};

let ctx: AudioContext | null = null;

/**
 * Whether a sound should be made at all.
 *
 * Exported so the decision can be tested without an audio device, which is
 * the half of this worth testing.
 */
export function shouldPlay({
  enabled,
  interacted,
  reducedMotion,
}: {
  enabled: boolean;
  interacted: boolean;
  reducedMotion: boolean;
}): boolean {
  return enabled && interacted && !reducedMotion;
}

/**
 * Make the noise. Never throws.
 *
 * The context is created once and reused: one per sound leaks handles, and
 * browsers cap how many a page may hold.
 */
export function play(cue: Cue): void {
  try {
    if (typeof window === "undefined") return;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    /* Suspended is the normal state until the page has been touched, and
       after a phone locks. Resuming is a promise nobody needs to wait for. */
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    for (const note of CUES[cue]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = note.hz;
      /* Ramped rather than switched. A gain that jumps to zero clicks, and
         the click is louder than the note. */
      gain.gain.setValueAtTime(0.0001, now + note.at);
      gain.gain.exponentialRampToValueAtTime(GAIN, now + note.at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.at + note.for);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + note.at);
      osc.stop(now + note.at + note.for + 0.02);
    }
  } catch {
    /* A beep is not worth an error. */
  }
}
