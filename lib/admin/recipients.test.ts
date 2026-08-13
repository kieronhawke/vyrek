import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The recipient lists are the whole point of this module: every admin
 * notification must reach both Kieron and Ben, on email and by text, no
 * matter which env vars happen to be set. These lock that in.
 */

const ENV_KEYS = [
  "CONSULTATION_INBOX",
  "BEN_EMAIL",
  "ADMIN_EMAILS",
  "BEN_MOBILE",
  "ADMIN_MOBILE",
] as const;

const BEN_EMAIL_PERSONAL = "benjaminsutherland33@gmail.com";
const BEN_MOBILE_PERSONAL = "07444858095";

async function load() {
  vi.resetModules();
  return await import("./recipients");
}

describe("adminEmails", () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("always includes Ben's personal address, even with nothing configured", async () => {
    const { adminEmails } = await load();
    expect(adminEmails()).toContain(BEN_EMAIL_PERSONAL);
  });

  it("includes the configured inbox and Ben, deduped and lowercased", async () => {
    process.env.CONSULTATION_INBOX = "Kieron.Hawke@Gmail.com";
    process.env.BEN_EMAIL = "ben@suthperformance.com";
    const { adminEmails } = await load();
    const list = adminEmails();
    expect(list).toContain("kieron.hawke@gmail.com");
    expect(list).toContain("ben@suthperformance.com");
    expect(list).toContain(BEN_EMAIL_PERSONAL);
    // no duplicates
    expect(new Set(list).size).toBe(list.length);
  });

  it("folds in the ADMIN_EMAILS comma list and drops blanks", async () => {
    process.env.ADMIN_EMAILS = "a@x.com, ,b@x.com,not-an-email";
    const { adminEmails } = await load();
    const list = adminEmails();
    expect(list).toContain("a@x.com");
    expect(list).toContain("b@x.com");
    expect(list).not.toContain("not-an-email");
    expect(list).not.toContain("");
  });

  it("does not double-count Ben if his personal address is also configured", async () => {
    process.env.ADMIN_EMAILS = BEN_EMAIL_PERSONAL;
    const { adminEmails } = await load();
    const count = adminEmails().filter((e) => e === BEN_EMAIL_PERSONAL).length;
    expect(count).toBe(1);
  });
});

describe("adminMobiles", () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("always includes Ben's personal mobile", async () => {
    const { adminMobiles } = await load();
    expect(adminMobiles()).toContain(BEN_MOBILE_PERSONAL);
  });

  it("dedupes the same handset written in different formats", async () => {
    // Ben's number configured as +44 form; the personal 07 form must not
    // add a second entry to the same phone.
    process.env.BEN_MOBILE = "+447444858095";
    const { adminMobiles } = await load();
    const list = adminMobiles();
    // exactly one entry maps to Ben's handset
    const benForms = list.filter(
      (n) => n.replace(/[^\d]/g, "").endsWith("7444858095"),
    );
    expect(benForms.length).toBe(1);
  });

  it("keeps a distinct admin number alongside Ben's", async () => {
    process.env.ADMIN_MOBILE = "07000000000";
    const { adminMobiles } = await load();
    const list = adminMobiles();
    expect(list).toContain("07000000000");
    expect(list).toContain(BEN_MOBILE_PERSONAL);
  });
});
