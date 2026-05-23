#!/usr/bin/env node
// Idempotently create the admin Supabase Auth user listed in ADMIN_EMAILS.
// Random password printed to stdout; the user resets via "Forgot password"
// or future "set password" flow. For now we just print it once.
//
// Run: node --env-file=.env.local scripts/seed-admin.mjs

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const allow = (process.env.ADMIN_EMAILS ?? "").split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

if (!url || !key) {
  console.error("Missing Supabase env.");
  process.exit(1);
}
if (allow.length === 0) {
  console.error("ADMIN_EMAILS is empty.");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const explicitPw = process.argv[2];

for (const email of allow) {
  // Does the user already exist?
  const { data: existing, error: listErr } = await sb.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) {
    console.error(`listUsers failed: ${listErr.message}`);
    process.exit(1);
  }
  const found = existing.users.find(
    (u) => (u.email ?? "").toLowerCase() === email,
  );
  if (found) {
    console.log(`already exists: ${email}  (id: ${found.id})`);
    if (explicitPw) {
      const { error: updErr } = await sb.auth.admin.updateUserById(found.id, {
        password: explicitPw,
        email_confirm: true,
      });
      if (updErr) console.error(`updateUserById failed: ${updErr.message}`);
      else console.log(`  password updated to provided value.`);
    }
    continue;
  }

  const password = explicitPw ?? crypto.randomBytes(12).toString("base64url");
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    console.error(`createUser failed for ${email}: ${error.message}`);
    continue;
  }
  console.log(`created: ${email}`);
  console.log(`  id:       ${data.user.id}`);
  console.log(`  password: ${password}`);
  console.log(`  (save this — only printed once)`);
}
