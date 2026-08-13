import { describe, it, expect } from "vitest";
import { chooseBooking, stageFor } from "@/lib/admin/leads-lifecycle";

const NOW = new Date("2026-08-13T12:00:00Z").getTime();
const future = (h: number) => new Date(NOW + h * 3600_000).toISOString();
const past = (h: number) => new Date(NOW - h * 3600_000).toISOString();

describe("chooseBooking", () => {
  it("prefers a confirmed upcoming call over a later cancelled one (the bug)", () => {
    const chosen = chooseBooking(
      [
        { startISO: future(24), status: "confirmed" }, // Tue
        { startISO: future(48), status: "cancelled" }, // Wed, later, cancelled
      ],
      NOW,
    );
    expect(chosen).toEqual({ startISO: future(24), status: "confirmed" });
  });

  it("falls back to the newest booking when none are live", () => {
    const chosen = chooseBooking(
      [
        { startISO: past(48), status: "confirmed" },
        { startISO: past(24), status: "cancelled" },
      ],
      NOW,
    );
    expect(chosen?.startISO).toBe(past(24));
  });

  it("treats a confirmed call within the last hour as still live", () => {
    const chosen = chooseBooking(
      [
        { startISO: past(0.5), status: "confirmed" },
        { startISO: future(72), status: "cancelled" },
      ],
      NOW,
    );
    expect(chosen?.status).toBe("confirmed");
  });

  it("returns null for no bookings", () => {
    expect(chooseBooking([], NOW)).toBeNull();
  });
});

describe("stageFor", () => {
  const base = { booking: null, hasInvite: false, linkOpenedISO: null, nowMs: NOW };

  it("client beats everything", () => {
    expect(
      stageFor({ ...base, hasCustomer: true, booking: { startISO: future(24), status: "confirmed" }, hasInvite: true }).stage,
    ).toBe("client");
  });

  it("a live booking reads as booked", () => {
    expect(stageFor({ ...base, hasCustomer: false, booking: { startISO: future(24), status: "confirmed" } }).stage).toBe("booked");
  });

  it("a cancelled booking with no invite reads as call_done, not booked", () => {
    const r = stageFor({ ...base, hasCustomer: false, booking: { startISO: future(24), status: "cancelled" } });
    expect(r.stage).toBe("call_done");
    expect(r.detail).toBe("Call was cancelled");
  });

  it("invite sent (unopened) reads as link_sent", () => {
    const r = stageFor({ ...base, hasCustomer: false, hasInvite: true });
    expect(r.stage).toBe("link_sent");
    expect(r.detail).toContain("not opened");
  });

  it("invite opened shows the opened date", () => {
    const r = stageFor({ ...base, hasCustomer: false, hasInvite: true, linkOpenedISO: past(2) });
    expect(r.stage).toBe("link_sent");
    expect(r.detail).toContain("opened");
  });

  it("a bare enquiry reads as new", () => {
    expect(stageFor({ ...base, hasCustomer: false }).stage).toBe("new");
  });
});
