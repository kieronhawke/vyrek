import { isGsm7, segments, smsLength } from "@/lib/sms/messages";

/**
 * SENDING A TEXT.
 *
 * Twilio, through a Messaging Service rather than a bare number. The service
 * ("Suth Performance", MG…) owns the sender pool and the opt-out list, so
 * Suth's messaging traffic, logs and STOP records stay separate from anything
 * else on the account — and adding a second number later needs no code change.
 *
 * SHAPED LIKE lib/email/send.ts ON PURPOSE. Same result type, same
 * not-configured behaviour, same honesty: a caller cannot tell whether it went
 * by looking at whether the function threw, so it returns why.
 *
 * IT NEVER THROWS ON A FAILED SEND. An SMS that does not go out must not take
 * down the onboarding request it was attached to — the client still needs the
 * email, and Ben still needs the link. Every failure is a returned reason.
 *
 * WHO IT COMES FROM IS A DECISION PER MESSAGE
 * -------------------------------------------
 * The service holds two senders: the brand name SUTH, and the UK number.
 *
 *   SUTH    looks like a company rather than a stranger, costs no rental, and
 *           CANNOT RECEIVE A REPLY. A text from it is a dead end.
 *   NUMBER  looks like a mobile, and can be replied to.
 *
 * So it depends entirely on whether the message expects an answer. "Your plan
 * is ready, here is the link" does not. "Haven't seen anything ticked off this
 * week, everything alright?" absolutely does — sending that from a name nobody
 * can reply to asks a question and then hangs up.
 *
 * MARKETING IS ALWAYS SENT FROM THE NUMBER, and the type system does not let
 * you choose otherwise. STOP only works on a sender that can receive it, and
 * marketing without a working opt-out is a PECR problem, not a preference.
 * Same rule as lib/control/messaging.ts, enforced at the other end of the
 * pipe.
 */

export type SmsResult =
  | { ok: true; sid: string; segments: number; sentAs: string }
  | { ok: false; reason: string };

function config() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const service = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!sid || !token || !service) return null;
  return { sid, token, service };
}

export function smsConfigured(): boolean {
  return config() !== null;
}

/**
 * UK mobile numbers in E.164, or null when it is not one.
 *
 * Ben types "07700 900123" because that is how a phone number is written in
 * this country. Twilio requires "+447700900123" and rejects anything else with
 * an error that reads like a bug in our code rather than a typo in his.
 */
export function toE164(input: string): string | null {
  const trimmed = input.replace(/[\s()-]/g, "");
  if (/^\+44\d{9,10}$/.test(trimmed)) return trimmed;
  if (/^0\d{9,10}$/.test(trimmed)) return `+44${trimmed.slice(1)}`;
  if (/^44\d{9,10}$/.test(trimmed)) return `+${trimmed}`;
  // Anything else with a plus is some other country; pass it through and let
  // Twilio decide rather than guessing.
  if (/^\+\d{8,15}$/.test(trimmed)) return trimmed;
  return null;
}

export type Sender =
  /** From "SUTH". Branded, free, and a dead end — nobody can reply. */
  | "brand"
  /** From the UK number. Replies reach the inbound webhook. */
  | "number";

export async function sendSms(args: {
  to: string;
  body: string;
  /**
   * Defaults to "number", deliberately.
   *
   * The safe failure is a text somebody can reply to when they did not need
   * to. The unsafe one is a question they cannot answer, so the branded
   * sender is opt-in per message rather than the default.
   */
  sender?: Sender;
  /**
   * Marketing is pinned to the number regardless of `sender`, because STOP
   * has to reach something.
   */
  marketing?: boolean;
}): Promise<SmsResult> {
  const cfg = config();
  if (!cfg) {
    return { ok: false, reason: "TWILIO_NOT_CONFIGURED" };
  }

  const to = toE164(args.to);
  if (!to) {
    return { ok: false, reason: `NOT_A_PHONE_NUMBER: ${args.to}` };
  }

  const body = args.body.trim();
  if (!body) return { ok: false, reason: "EMPTY_MESSAGE" };

  const count = segments(body);
  if (count > 3) {
    // Not a hard limit of Twilio's — a limit of ours. A four-segment text is
    // almost always a template with a variable that did not substitute, and
    // sending it costs four times as much as noticing.
    return {
      ok: false,
      reason: `TOO_LONG: ${smsLength(body)} characters, ${count} segments${
        isGsm7(body) ? "" : " (non-GSM characters halve each segment)"
      }`,
    };
  }

  const params = new URLSearchParams({
    MessagingServiceSid: cfg.service,
    To: to,
    Body: body,
  });

  // Named explicitly rather than left to the service to choose: with both a
  // name and a number in the pool Twilio picks the number every time, so the
  // brand would never be used without saying so.
  const brand = process.env.TWILIO_ALPHA_SENDER;
  if (args.sender === "brand" && brand && !args.marketing) {
    params.set("From", brand);
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${cfg.sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${cfg.sid}:${cfg.token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
        // Without this a hung connection blocks the request that called it.
        // Twilio has no default timeout and neither does fetch.
        signal: AbortSignal.timeout(10_000),
      },
    );

    const data = (await res.json()) as {
      sid?: string;
      message?: string;
      code?: number;
    };

    if (!res.ok || !data.sid) {
      return {
        ok: false,
        reason: data.message ? `${data.code ?? res.status}: ${data.message}` : `HTTP ${res.status}`,
      };
    }

    return {
      ok: true,
      sid: data.sid,
      segments: count,
      sentAs: params.get("From") ?? "number",
    };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error && error.name === "TimeoutError"
          ? "TIMEOUT"
          : error instanceof Error
            ? error.message
            : "unknown",
    };
  }
}
