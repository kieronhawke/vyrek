/**
 * The login the harness signs in with.
 *
 *   node --env-file=.env.local scripts/e2e/admin.mjs        # create or reset
 *   node --env-file=.env.local scripts/e2e/admin.mjs --drop # remove it
 *
 * Kept out of production's ADMIN_EMAILS on purpose: it is only an admin
 * against a locally served build, where the list is passed in on the command
 * line. cleanup-e2e.mjs removes it along with everything else, so run this
 * before a test session and it will not linger afterwards.
 *
 * Set E2E_ADMIN_PASSWORD to whatever the harness will use.
 */
import { createClient } from "@supabase/supabase-js";

const EMAIL = process.env.E2E_ADMIN_EMAIL ?? "kieron.hawke+admin-e2e@googlemail.com";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;
if (!PASSWORD) {
  console.error("Set E2E_ADMIN_PASSWORD first.");
  process.exit(1);
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const { data } = await sb.auth.admin.listUsers({ perPage: 200 });
const existing = data.users.find((u) => u.email === EMAIL);

if (process.argv.includes("--drop")) {
  if (existing) await sb.auth.admin.deleteUser(existing.id);
  console.log(existing ? `removed ${EMAIL}` : `${EMAIL} was not there`);
} else if (existing) {
  const { error } = await sb.auth.admin.updateUserById(existing.id, {
    password: PASSWORD,
    email_confirm: true,
  });
  console.log(error ? `failed: ${error.message}` : `reset ${EMAIL}`);
} else {
  const { error } = await sb.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "E2E Admin" },
  });
  console.log(error ? `failed: ${error.message}` : `created ${EMAIL}`);
}
