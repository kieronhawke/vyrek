import { describe, expect, it } from "vitest";
import {
  EMAIL_BODY_MAX,
  EMAIL_SUBJECT_MAX,
  SMS_MESSAGE_MAX,
  assembleSms,
  checkEmail,
  checkSmsMessage,
  defaultInviteEmailBody,
  defaultInviteEmailSubject,
  defaultInviteSmsMessage,
  normaliseSmsText,
  toParagraphs,
} from "./message-copy";
import { paymentSchedule } from "./schedule";
import { todayDay } from "./start-date";
import { isGsm7, segments } from "@/lib/sms/messages";

/**
 * WHAT THE INVITE SAYS, AND WHAT BEN MAY DO TO IT.
 *
 * Two things are pinned here. The default wording fits one text message in
 * every arrangement Ben can produce — because the day it does not, the
 * longest deal he can type is the one that silently costs double. And an
 * edited message can never lose the link, be sent empty, or be sent in a
 * state the transport refuses.
 */

/** The real length of a short-id link, which is what clients actually get. */
const LINK = "suthperformance.com/o/k7m2xq9raf";
const DATED = todayDay() + 10;

/** Every arrangement the form can produce, at both ends of both bands. */
const SHAPES = [
  ["nothing owed, starting today", { amountPence: 6000 }],
  ["nothing owed, starting later", { amountPence: 6000, startDay: DATED }],
  ["balance, starting today", { amountPence: 6000, dueTodayPence: 10000 }],
  ["balance, starting later", { amountPence: 6000, dueTodayPence: 10000, startDay: DATED }],
  ["top of both bands", { amountPence: 200000, dueTodayPence: 1_000_000, startDay: DATED }],
] as const;

/** Realistic worst cases: the name is billed once in the greeting. */
const NAMES = ["Sam", "Christopher", "Konstantinos", "Alexandrina"];

describe("the standard text message", () => {
  it("fits one segment for every arrangement and every realistic name", () => {
    for (const name of NAMES) {
      for (const [label, input] of SHAPES) {
        const body = assembleSms(
          defaultInviteSmsMessage(name, "payment", paymentSchedule(input)),
          LINK,
        );
        expect(segments(body), `${name} / ${label}: ${body.length} chars — ${body}`).toBe(1);
        expect(isGsm7(body), `non-GSM in: ${body}`).toBe(true);
      }
      const full = assembleSms(defaultInviteSmsMessage(name, "full", null), LINK);
      expect(segments(full), `${name} / full set-up: ${full}`).toBe(1);
      expect(isGsm7(full)).toBe(true);
    }
  });

  it("reads like Ben rather than an instruction", () => {
    const body = defaultInviteSmsMessage(
      "Kieron",
      "payment",
      paymentSchedule({ amountPence: 6000, dueTodayPence: 10000, startDay: DATED }),
    );
    expect(body).toContain("Hi Kieron, it's Ben.");
    expect(body).toContain("Here's your payment link as we discussed");
    // The figures are what prove the text is genuine and not a scam.
    expect(body).toContain("£100 today");
    expect(body).toContain("£60/mo");
    // The old wording opened by telling them what to do with their card.
    expect(body).not.toMatch(/set your card up/i);
  });

  it("says the amount even when there is no balance or date", () => {
    const body = defaultInviteSmsMessage("Sam", "payment", paymentSchedule({ amountPence: 6000 }));
    expect(body).toContain("£60/mo");
  });

  it("never carries the link itself, so the link cannot be edited away", () => {
    for (const [, input] of SHAPES) {
      const msg = defaultInviteSmsMessage("Sam", "payment", paymentSchedule(input));
      expect(msg).not.toContain("suthperformance.com");
      expect(msg).not.toMatch(/https?:/);
    }
  });
});

describe("straightening what a keyboard produces", () => {
  it("converts the characters that silently halve every segment", () => {
    const typed = "Here’s your link — “as discussed”…";
    const clean = normaliseSmsText(typed);
    expect(clean).toBe(`Here's your link - "as discussed"...`);
    expect(isGsm7(clean)).toBe(true);
  });

  it("removes the invisible characters that arrive with a paste", () => {
    expect(normaliseSmsText("a​b﻿c")).toBe("abc");
    expect(normaliseSmsText("a b")).toBe("a b");
  });

  it("leaves ordinary text alone", () => {
    const plain = "Hi Sam, it's Ben. Here's your payment link as we discussed - £60/mo.";
    expect(normaliseSmsText(plain)).toBe(plain);
  });
});

describe("a message Ben has edited", () => {
  it("is accepted, normalised, and always gets the link", () => {
    const check = checkSmsMessage("Morning Sam — here’s that link:", LINK);
    expect(check.ok).toBe(true);
    expect(check.message).toBe("Morning Sam - here's that link:");
    expect(check.body).toBe("Morning Sam - here's that link: " + LINK);
    expect(check.body.endsWith(LINK)).toBe(true);
    expect(check.segments).toBe(1);
    expect(check.warning).toBeNull();
  });

  it("is refused when empty, and says how to get the standard one back", () => {
    for (const empty of ["", "   ", "\n\n"]) {
      const check = checkSmsMessage(empty, LINK);
      expect(check.ok).toBe(false);
      expect(check.error).toMatch(/reset/i);
    }
  });

  it("is refused when it would be more texts than the network will take", () => {
    const check = checkSmsMessage("x".repeat(SMS_MESSAGE_MAX + 1), LINK);
    expect(check.ok).toBe(false);
    expect(check.error).toMatch(/characters/i);
  });

  it("warns rather than blocks at two segments, because that is Ben's call", () => {
    const check = checkSmsMessage("Sam, ".repeat(30), LINK);
    expect(check.ok).toBe(true);
    expect(check.segments).toBeGreaterThan(1);
    expect(check.warning).toMatch(/texts/i);
  });

  it("warns about characters that genuinely cost double", () => {
    const check = checkSmsMessage("Here you go \u{1F44D}", LINK);
    expect(check.gsm).toBe(false);
    expect(check.warning).toMatch(/double/i);
    // Still sendable: it is one message, it just costs more.
    expect(check.ok).toBe(true);
  });
});

describe("the email", () => {
  it("has a subject that names the person and the thing", () => {
    expect(defaultInviteEmailSubject("Sam", "payment")).toBe("Sam, your payment link");
    expect(defaultInviteEmailSubject("Sam", "full")).toBe("Sam, let's get you set up");
  });

  it("does not repeat the greeting the template already prints", () => {
    const body = defaultInviteEmailBody("payment", paymentSchedule({ amountPence: 6000 }));
    expect(body).not.toMatch(/^(Hi|Good|Hello|Dear)\b/i);
    expect(body).toContain("as we discussed");
  });

  it("states the schedule in the same words as everywhere else", () => {
    const schedule = paymentSchedule({ amountPence: 6000, dueTodayPence: 10000, startDay: DATED });
    const body = defaultInviteEmailBody("payment", schedule);
    expect(body).toContain("£100 today, for your outstanding balance.");
    expect(body).toMatch(/Then £60 a month from \w+ \d+ \w+/);
  });

  it("keeps single line breaks inside a paragraph", () => {
    /* Somebody typing a note presses return once between lines. Collapsing
       those runs the whole thing together and the email looks broken. */
    const paras = toParagraphs("line one\nline two\n\nsecond para");
    expect(paras).toEqual(["line one\nline two", "second para"]);
  });

  it("splits into paragraphs on blank lines", () => {
    expect(toParagraphs("one\n\ntwo\n\n\nthree")).toEqual(["one", "two", "three"]);
    expect(toParagraphs("  \n ")).toEqual([]);
  });

  it("refuses an empty subject or body, and an over-long one", () => {
    expect(checkEmail("", "Body").ok).toBe(false);
    expect(checkEmail("Subject", "").ok).toBe(false);
    expect(checkEmail("s".repeat(EMAIL_SUBJECT_MAX + 1), "Body").ok).toBe(false);
    expect(checkEmail("Subject", "b".repeat(EMAIL_BODY_MAX + 1)).ok).toBe(false);
  });

  it("accepts a real edit and hands back paragraphs", () => {
    const check = checkEmail("  Sam, your link  ", "First line.\n\nSecond line.");
    expect(check.ok).toBe(true);
    expect(check.subject).toBe("Sam, your link");
    expect(check.paragraphs).toEqual(["First line.", "Second line."]);
  });
});
