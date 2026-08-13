import { describe, it, expect } from "vitest";
import { leadAlertSms, leadAlertSmsUnstored, leadAlertCost } from "./alert";
import type { Lead } from "./model";

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "abc123",
    createdISO: "2026-08-14T10:00:00.000Z",
    name: "Christopher Sutherland",
    email: "chris@example.com",
    phone: "07700900000",
    invitedAtISO: null,
    rail: null,
    wants: "A free consultation",
    readiness: null,
    goal: "Sub-90",
    programme: null,
    injury: null,
    brief: "brief",
    city: "Manchester",
    region: "England",
    country: "GB",
    latitude: null,
    longitude: null,
    landingPath: null,
    referrer: null,
    secondsOnSite: null,
    pageViews: null,
    sourcePath: null,
    ...overrides,
  };
}

describe("leadAlertSmsUnstored", () => {
  it("links to the admin list, not a dead /l/ page", () => {
    const body = leadAlertSmsUnstored(lead(), "https://www.suthperformance.com");
    expect(body).toContain("/admin/leads");
    expect(body).not.toContain("/l/");
  });

  it("still carries the name and number", () => {
    const body = leadAlertSmsUnstored(lead(), "https://www.suthperformance.com");
    expect(body).toContain("Christopher");
    expect(body).toContain("07700900000");
  });

  it("stays one GSM-7 segment even with a long name", () => {
    const body = leadAlertSmsUnstored(
      lead({ name: "Alexandria Featherstonehaugh" }),
      "https://www.suthperformance.com",
    );
    const cost = leadAlertCost(body);
    expect(cost.gsm7).toBe(true);
    expect(cost.segments).toBeLessThanOrEqual(1);
  });

  it("the stored variant still uses the /l/ deep link", () => {
    const body = leadAlertSms(lead(), "https://www.suthperformance.com");
    expect(body).toContain("/l/abc123");
  });
});
