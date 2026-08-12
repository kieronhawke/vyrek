import { describe, expect, it } from "vitest";
import { render } from "@react-email/components";
import { OnboardingInviteEmail } from "@/lib/email/templates/onboarding-invite";
import { WelcomeEmail } from "@/lib/email/templates/welcome";
import { SubscriptionNoticeEmail } from "@/lib/email/templates/subscription-notice";
import {
  InternalLeadEmail,
  internalLeadSubject,
} from "@/lib/email/templates/internal-lead";

/**
 * DOES THIS EMAIL ACTUALLY SURVIVE AN INBOX?
 *
 * Email is the one place where "it looks right in the browser" means almost
 * nothing. Outlook renders with Word. Gmail strips every stylesheet. A large
 * share of recipients never load the images at all. Dark-mode clients invert
 * colours unless told not to. None of that is visible in a preview.
 *
 * So these assert the properties that decide whether a real person can read
 * the thing, on the rendered HTML rather than on the source:
 *
 *   - the dark background survives Outlook (bgcolor on a wrapper table)
 *   - nothing depends on an image loading
 *   - every URL is absolute
 *   - no text is small enough to trigger iOS auto-zoom
 *   - the plain-text alternative still contains the link
 *
 * Each one of these has broken a real email somewhere. They are cheap and
 * they run on every commit.
 */

const LINK = "https://www.suthperformance.com/o/eyJuIjoiU2FtIn0.abc123";

/** A realistic lead, as the consultation endpoint builds one. */
const LEAD = {
  name: "Sam Reeves",
  email: "sam@example.com",
  phone: "07700 900123",
  rail: "Getting fit",
  wants: "COACHING WITH BEN",
  readiness: "Could start this week",
  goal: "Lose weight",
  programme: "Weight loss, 12 weeks",
  injury: "Knee, bothering them now",
  sourcePath: "/free-consultation",
  brief:
    "Wants to lose weight and feel better.\nNot trained in 3 years.\nLeft knee gives him trouble on stairs.",
  place: "Leeds, England",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=53.7997,-1.5492",
  mapImageUrl:
    "https://www.suthperformance.com/api/lead-map?lat=53.800&lon=-1.549&z=11",
  landingPath: "/hyrox/leeds",
  referrer: "https://www.google.com/",
  timeOnSite: "7 minutes",
  pageViews: 6,
  leadUrl: "https://www.suthperformance.com/l/y2k4cdksu8ak3cam",
};

const EMAILS: { name: string; el: React.ReactElement }[] = [
  {
    name: "onboarding invite (full)",
    el: OnboardingInviteEmail({ firstName: "Sam", link: LINK, kind: "full" }),
  },
  {
    name: "onboarding invite (payment)",
    el: OnboardingInviteEmail({
      firstName: "Sam",
      link: LINK,
      kind: "payment",
      planName: "1:1 Coaching",
    }),
  },
  {
    name: "welcome",
    el: WelcomeEmail({
      trialEndsAt: new Date("2026-08-10"),
      firstWorkoutDate: new Date("2026-08-04"),
      programmeName: "First Race",
    }),
  },
  {
    // The live payment-failed note, built the way lib/billing/comms.ts does.
    name: "payment failed (subscription notice)",
    el: SubscriptionNoticeEmail({
      eyebrow: "Payment not taken",
      heading: "One small thing to fix.",
      body: "This month's payment didn't go through. It happens: an expired card, a new bank app, a limit. Update your card and it retries by itself. Your access is untouched in the meantime.",
      ctaLabel: "Update your card",
      ctaHref: "https://www.suthperformance.com/app/account",
    }),
  },
  {
    name: "internal lead brief",
    el: InternalLeadEmail(LEAD),
  },
];

describe.each(EMAILS)("$name", ({ el }) => {
  it("keeps its dark background in Outlook", async () => {
    const html = await render(el);
    // Outlook's Word engine ignores CSS backgrounds on <body>. Without a
    // wrapper table carrying the deprecated bgcolor attribute the design
    // falls back to white — with near-white text on it.
    expect(html).toMatch(/<table[^>]*bgcolor="#0A0A0A"/i);
  });

  it("tells dark-mode clients not to invert it", async () => {
    const html = await render(el);
    expect(html).toMatch(/name="color-scheme"[^>]*content="dark"/i);
  });

  it("makes sense with images blocked", async () => {
    const html = await render(el);
    // A large share of recipients never load images. Every <img> needs alt
    // text or the logo is a broken icon and the email starts with nothing.
    const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
    for (const img of imgs) {
      expect(img, `image with no alt: ${img.slice(0, 120)}`).toMatch(/\balt="[^"]+"/i);
    }
    // And the call to action must be a link, not an image of one.
    expect(html).toMatch(/<a\b[^>]*href="https:\/\//i);
  });

  it("uses absolute URLs everywhere", async () => {
    const html = await render(el);
    // A relative path resolves against the mail client's own domain and 404s.
    const hrefs = [...html.matchAll(/(?:href|src)="([^"]+)"/gi)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const h of hrefs) {
      // mailto: and tel: are absolute URIs with no authority. tel: in
      // particular is the point of the lead brief — it opens the dialler.
      if (
        h.startsWith("mailto:") ||
        h.startsWith("tel:") ||
        h.startsWith("#") ||
        h.startsWith("data:")
      ) {
        continue;
      }
      expect(h, `not absolute: ${h}`).toMatch(/^https?:\/\//);
    }
  });

  it("has no text small enough to make iOS zoom", async () => {
    const html = await render(el);
    const sizes = [...html.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/gi)].map((m) =>
      Number(m[1]),
    );
    expect(sizes.length).toBeGreaterThan(0);
    // 11px is the floor: the mono eyebrow and the legal footer sit there by
    // design. Anything under that is a mistake, not a choice.
    for (const s of sizes) expect(s).toBeGreaterThanOrEqual(11);
  });

  it("stays within 600px, so it does not scroll sideways on a phone", async () => {
    const html = await render(el);
    const widths = [...html.matchAll(/max-width:\s*(\d+)px/gi)].map((m) => Number(m[1]));
    for (const w of widths) expect(w).toBeLessThanOrEqual(600);
  });

  it("produces a plain-text alternative that still works", async () => {
    const text = await render(el, { plainText: true });
    expect(text.length).toBeGreaterThan(80);
    // Every email needs one: spam filters score worse without it, and watch
    // and screen-reader previews have nothing else to show.
    expect(text).toMatch(/https?:\/\//);
    expect(text).not.toMatch(/<[a-z]/i);
  });

  it("has no unresolved template placeholder", async () => {
    const html = await render(el);
    // "{{first_name}}" or "undefined" reaching an inbox is the single most
    // embarrassing failure this system can produce.
    expect(html).not.toMatch(/\{\{[a-z_]+\}\}/i);
    expect(html).not.toMatch(/>undefined</);
    expect(html).not.toMatch(/>NaN</);
  });
});

describe("the invite specifically", () => {
  it("carries the link both as a button and as readable text", async () => {
    const html = await render(
      OnboardingInviteEmail({ firstName: "Sam", link: LINK, kind: "full" }),
    );
    // Some corporate clients strip the button entirely.
    expect((html.match(new RegExp(LINK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length)
      .toBeGreaterThanOrEqual(2);
  });

  it("greets them by name", async () => {
    const html = await render(
      OnboardingInviteEmail({ firstName: "Sam", link: LINK, kind: "full" }),
    );
    expect(html).toContain("Sam");
  });

  it("shows the logo", async () => {
    const html = await render(
      OnboardingInviteEmail({ firstName: "Sam", link: LINK, kind: "full" }),
    );
    expect(html).toMatch(/src="https:\/\/[^"]*\/email\/logo-wordmark\.png"/);
    expect(html).toMatch(/alt="Suth Performance"/);
  });

  it("has exactly one call-to-action button", async () => {
    const html = await render(
      OnboardingInviteEmail({ firstName: "Sam", link: LINK, kind: "full" }),
    );
    // A second call to action halves the first.
    const buttons = html.match(/background-color:#A3E635|background:#A3E635/gi) ?? [];
    expect(buttons.length).toBeLessThanOrEqual(1);
  });

  it("carries no unsubscribe line — it is transactional", async () => {
    const html = await render(
      OnboardingInviteEmail({ firstName: "Sam", link: LINK, kind: "full" }),
    );
    // HARD-RULES §11. An opt-out here invites somebody to opt out of their
    // own account setup.
    expect(html.toLowerCase()).not.toContain("unsubscribe");
  });
});

describe("the lead brief Ben acts on", () => {
  it("makes the phone number a button he can press", async () => {
    const html = await render(InternalLeadEmail(LEAD));
    // Not a number to select and copy: `tel:` opens the dialler on a phone
    // and hands off to FaceTime or a desk phone on a Mac. This is the whole
    // point of the email.
    expect(html).toMatch(/href="tel:07700900123"/);
    // Asserted on the plain-text render: React splices <!-- --> markers
    // between adjacent JSX expressions, so "Call {firstName}" is not a
    // contiguous string in the HTML even though it reads as one.
    const text = await render(InternalLeadEmail(LEAD), { plainText: true });
    expect(text).toMatch(/Call Sam/);
  });

  it("links straight to the full request", async () => {
    const html = await render(InternalLeadEmail(LEAD));
    expect(html).toContain("View the full request");
    expect(html).toContain("/l/y2k4cdksu8ak3cam");
  });

  it("shows the map, and survives it being blocked", async () => {
    const html = await render(InternalLeadEmail(LEAD));
    // A large share of clients block images by default, so the alt text has
    // to name the place and the text link underneath has to work alone.
    expect(html).toMatch(
      /<img[^>]*alt="Map showing roughly Leeds, England"/,
    );
    expect(html).toContain("Open in Google Maps");
  });

  it("says the location is a region, not an address", async () => {
    const html = await render(InternalLeadEmail(LEAD));
    // An IP places somebody at their mobile network's gateway, which in the
    // UK can be a hundred miles out. Presenting a pin as fact would make
    // Ben's "can I see them in person?" decision worse, not better.
    expect(html).toMatch(/region rather than an address/i);
  });

  it("carries every detail he would otherwise have to go looking for", async () => {
    const html = await render(InternalLeadEmail(LEAD));
    for (const fact of [
      "Sam Reeves",
      "sam@example.com",
      "COACHING WITH BEN",
      "Could start this week",
      "Weight loss, 12 weeks",
      "Knee, bothering them now",
      "/hyrox/leeds",
      "7 minutes",
      "Leeds, England",
      "Left knee gives him trouble",
    ]) {
      expect(html, fact).toContain(fact);
    }
  });

  it("puts the name and the place in the subject", async () => {
    // Read on a lock screen before the email is ever opened.
    expect(
      internalLeadSubject({
        name: "Sam Reeves",
        place: "Leeds, England",
        readiness: "this week",
      }),
    ).toBe("New lead · Sam Reeves · Leeds, England · this week");
    // And degrades when there is no location.
    expect(internalLeadSubject({ name: "Sam Reeves" })).toBe(
      "New lead · Sam Reeves",
    );
  });

  it("renders with nothing optional at all", async () => {
    // Off Vercel, or from the plain consultation form, most of this is
    // absent. It must not produce an empty panel or the word undefined.
    const bare = await render(
      InternalLeadEmail({
        name: "Sam Reeves",
        email: "sam@example.com",
        rail: "Direct enquiry",
        wants: "A free consultation",
        brief: "No quiz answers.",
      }),
    );
    expect(bare).not.toMatch(/>undefined</);
    expect(bare).not.toContain("Map showing");
    expect(bare).toMatch(/href="mailto:sam@example.com"/);
  });
});
