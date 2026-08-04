import { describe, expect, it } from "vitest";
import {
  deliveryLine,
  setupBlocker,
  setupErrorText,
  type SetupRequest,
  type SetupResult,
} from "./setup-invite";

const req = (over: Partial<SetupRequest> = {}): SetupRequest => ({
  name: "Sam Reeves",
  email: "sam@example.com",
  phone: "",
  kind: "full",
  ...over,
});

describe("what stops an invite going out", () => {
  it("lets a complete one through", () => {
    expect(setupBlocker(req())).toBeNull();
    expect(setupBlocker(req({ email: "", phone: "07700900000" }))).toBeNull();
  });

  it("needs a name and somewhere to send it", () => {
    expect(setupBlocker(req({ name: "  " }))).toContain("name");
    expect(setupBlocker(req({ email: "", phone: "" }))).toContain("nowhere to send");
  });

  it("catches an address that will bounce", () => {
    expect(setupBlocker(req({ email: "sam@example" }))).toContain("does not look right");
  });

  /**
   * The one worth being strict about. Silently dropping an unreadable price
   * sends the published tiers to somebody Ben had just quoted £150 for, and
   * he does not find out until they ring back.
   */
  it("refuses an agreed price it cannot read, rather than ignoring it", () => {
    expect(setupBlocker(req({ agreedPrice: "one fifty" }))).toContain("price");
    expect(setupBlocker(req({ agreedPrice: "15000" }))).toContain("price");
    expect(setupBlocker(req({ agreedPrice: "£150" }))).toBeNull();
    expect(setupBlocker(req({ agreedPrice: "  " }))).toBeNull();
  });
});

describe("saying what happened", () => {
  const result = (over: Partial<SetupResult> = {}): SetupResult => ({
    link: "https://www.suthperformance.com/o/k7m2xq9raf",
    secured: true,
    email: { attempted: true, ok: true, reason: null, sandbox: false },
    sms: { attempted: false, ok: false, reason: null, text: null },
    ...over,
  });

  it("says which channels went", () => {
    expect(deliveryLine(result())).toBe("Email sent.");
    expect(
      deliveryLine(
        result({ sms: { attempted: true, ok: true, reason: null, text: "hi" } }),
      ),
    ).toBe("Email sent. Text sent.");
  });

  /* Never a tick for something that did not transmit: Ben would stop chasing
     somebody who never heard from him. */
  it("names a failure and its reason", () => {
    const line = deliveryLine(
      result({
        email: { attempted: true, ok: false, reason: "DOMAIN_UNVERIFIED", sandbox: false },
      }),
    );
    expect(line).toContain("failed");
    expect(line).toContain("DOMAIN_UNVERIFIED");
  });

  /* Sent, technically, and to nobody who wanted it. Worth its own sentence. */
  it("does not call a sandbox send a delivery", () => {
    const line = deliveryLine(
      result({ email: { attempted: true, ok: true, reason: null, sandbox: true } }),
    );
    expect(line).toContain("only reaches your own address");
  });

  it("says plainly when nothing was attempted", () => {
    const line = deliveryLine(
      result({
        email: { attempted: false, ok: false, reason: null, sandbox: false },
      }),
    );
    expect(line).toContain("copy the link");
  });
});

describe("turning an error code into something actionable", () => {
  it("translates the ones the API returns", () => {
    expect(setupErrorText("PRICE_INVALID")).toContain("price");
    expect(setupErrorText("EMAIL_INVALID")).toContain("email");
    expect(setupErrorText("CONTACT_REQUIRED")).toContain("nowhere to send");
  });

  /* An unrecognised code still has to say whether anything was sent. "Try
     again" without that leaves Ben wondering if he is about to double-send. */
  it("says nothing was sent when it does not recognise the code", () => {
    expect(setupErrorText("KABOOM")).toContain("Nothing was sent");
    expect(setupErrorText(undefined)).toContain("Nothing was sent");
  });
});
