import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The recipient lists are the whole point of this module: every admin
 * notification goes to BEN and to nobody else, no matter which env vars
 * happen to be set.
 *
 * Kieron was on these lists until 2026-09-06, so a real client signing up
 * texted his phone and emailed his personal Gmail. The tests that used to
 * assert he was included now assert the opposite, because that is the bug.
 */

const ENV_KEYS = [
  "CONSULTATION_INBOX",
  "BEN_EMAIL",
  "ADMIN_EMAILS",
  "BEN_MOBILE",
  "ADMIN_MOBILE",
] as const;

const BEN_EMAIL_WORK = "ben@suthperformance.com";
const BEN_EMAIL_PERSONAL = "benjaminsutherland33@gmail.com";
const BEN_MOBILE = "07444858095";

const KIERON_EMAILS = [
  "kieron.hawke@gmail.com",
  "kieron.hawke@googlemail.com",
  "kieronhawke@gmail.com",
];
const KIERON_MOBILE = "07398790378";

async function load() {
  vi.resetModules();
  return await import("./recipients");
}

function isolateEnv() {
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
}

describe("adminEmails", () => {
  isolateEnv();

  it("reaches Ben on both addresses with nothing configured", async () => {
    const { adminEmails } = await load();
    const list = adminEmails();
    expect(list).toContain(BEN_EMAIL_WORK);
    expect(list).toContain(BEN_EMAIL_PERSONAL);
  });

  it("never includes Kieron, whatever the environment says", async () => {
    // Every variable that used to put him back on the list, all at once.
    process.env.CONSULTATION_INBOX = "kieron.hawke@gmail.com";
    process.env.ADMIN_EMAILS =
      "kieron.hawke@googlemail.com,ben@suthperformance.com";
    const { adminEmails } = await load();
    const list = adminEmails();
    for (const e of KIERON_EMAILS) expect(list).not.toContain(e);
  });

  it("ignores ADMIN_EMAILS entirely, because that is the sign-in allowlist", async () => {
    process.env.ADMIN_EMAILS = "a@x.com,b@x.com";
    const { adminEmails } = await load();
    const list = adminEmails();
    expect(list).not.toContain("a@x.com");
    expect(list).not.toContain("b@x.com");
  });

  it("lets BEN_EMAIL override the work address, lowercased and deduped", async () => {
    process.env.BEN_EMAIL = "Ben@SuthPerformance.com";
    const { adminEmails } = await load();
    const list = adminEmails();
    expect(list).toContain(BEN_EMAIL_WORK);
    expect(new Set(list).size).toBe(list.length);
  });

  it("does not double-count Ben when BEN_EMAIL is his personal address", async () => {
    process.env.BEN_EMAIL = BEN_EMAIL_PERSONAL;
    const { adminEmails } = await load();
    const count = adminEmails().filter((e) => e === BEN_EMAIL_PERSONAL).length;
    expect(count).toBe(1);
  });
});

describe("adminMobiles", () => {
  isolateEnv();

  it("falls back to Ben's real number when nothing is configured", async () => {
    const { adminMobiles } = await load();
    expect(adminMobiles()).toEqual([BEN_MOBILE]);
  });

  it("never texts Kieron via ADMIN_MOBILE", async () => {
    process.env.ADMIN_MOBILE = KIERON_MOBILE;
    const { adminMobiles } = await load();
    const list = adminMobiles();
    expect(list).not.toContain(KIERON_MOBILE);
    expect(list).toContain(BEN_MOBILE);
  });

  it("dedupes the same handset written in different formats", async () => {
    process.env.BEN_MOBILE = "+447444858095";
    const { adminMobiles } = await load();
    const benForms = adminMobiles().filter((n) =>
      n.replace(/[^\d]/g, "").endsWith("7444858095"),
    );
    expect(benForms.length).toBe(1);
  });

  it("honours BEN_MOBILE when it is set to a different handset", async () => {
    // The override still works; production had it pointed at the wrong
    // person, which is an env problem rather than a code one.
    process.env.BEN_MOBILE = "07000000000";
    const { adminMobiles } = await load();
    expect(adminMobiles()).toEqual(["07000000000"]);
  });
});
