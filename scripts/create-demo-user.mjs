#!/usr/bin/env node
// Create the demo Supabase Auth user for funnel testing. Idempotent:
// if the user already exists, just resets the password.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Load .env.local manually (no dotenv in this repo)
const envFile = readFileSync("/Users/kieronhawke/code/vyrek/.env.local", "utf8");
const env = Object.fromEntries(
  envFile
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = env.SUPABASE_SECRET_KEY;
if (!URL || !SECRET) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const admin = createClient(URL, SECRET, { auth: { persistSession: false } });

const EMAIL = "demo@vyrek.test";
const PASSWORD = "VyrekDemo2026!";

// 1. Try create. If conflict (already exists), look up and reset password.
console.log(`Creating ${EMAIL}…`);
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
});

if (createErr) {
  if (/already (been )?registered|exists/i.test(createErr.message)) {
    console.log("  user exists, finding ID + resetting password");
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      perPage: 200,
    });
    if (listErr) {
      console.error("  list users failed:", listErr.message);
      process.exit(1);
    }
    const u = list.users.find((x) => x.email === EMAIL);
    if (!u) {
      console.error("  user reportedly exists but not found in list");
      process.exit(1);
    }
    const { error: updErr } = await admin.auth.admin.updateUserById(u.id, {
      password: PASSWORD,
      email_confirm: true,
    });
    if (updErr) {
      console.error("  password reset failed:", updErr.message);
      process.exit(1);
    }
    console.log(`  reset (id=${u.id})`);
  } else {
    console.error("  create failed:", createErr.message);
    process.exit(1);
  }
} else {
  console.log(`  created (id=${created.user?.id})`);
}

// 2. Verify the login works against the same auth endpoint by signing in
//    with the anon key (same path the browser uses).
console.log(`\nVerifying sign-in…`);
const anon = createClient(URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});
const { data: session, error: signInErr } = await anon.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
});
if (signInErr) {
  console.error(`  SIGN-IN FAILED: ${signInErr.message}`);
  process.exit(1);
}
console.log(`  OK — user=${session.user.id}  token expires=${new Date(session.session.expires_at * 1000).toISOString()}`);

console.log(`\n✓ Demo credentials ready:`);
console.log(`  email:    ${EMAIL}`);
console.log(`  password: ${PASSWORD}`);
console.log(`  /login   → /app/today after sign-in`);
