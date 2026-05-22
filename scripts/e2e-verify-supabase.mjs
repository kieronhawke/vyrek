import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const customerId = readFileSync("/tmp/vyrek-test-customer.txt", "utf8").trim();
const quizResponseId = readFileSync("/tmp/vyrek-test-quiz.txt", "utf8").trim();
const email = "test+verify@vyrek.com";

console.log("Query targets:");
console.log("  customerId      ", customerId);
console.log("  quizResponseId  ", quizResponseId);
console.log("  email           ", email);
console.log();

// 1) customer row
const { data: customer, error: ce } = await sb
  .from("customers")
  .select("id, email, referral_code, stripe_customer_id, created_at")
  .eq("id", customerId)
  .single();
console.log("customers row:");
if (ce) console.log("  ✗ ERROR:", ce.message);
else console.log(" ", JSON.stringify(customer));
console.log();

// 2) quiz_response row
const { data: qr, error: qe } = await sb
  .from("quiz_responses")
  .select("id, customer_id, email, program, path, answers, created_at")
  .eq("id", quizResponseId)
  .single();
console.log("quiz_responses row:");
if (qe) console.log("  ✗ ERROR:", qe.message);
else console.log(" ", JSON.stringify(qr));
console.log();

// 3) abandoned_plans row (scheduled — recovered_at should be null)
const { data: ap, error: ae } = await sb
  .from("abandoned_plans")
  .select("id, email, quiz_uuid, program, recovered_at, created_at")
  .eq("email", email)
  .order("created_at", { ascending: false })
  .limit(1)
  .single();
console.log("abandoned_plans row:");
if (ae) console.log("  ✗ ERROR:", ae.message);
else console.log(" ", JSON.stringify(ap));
console.log();

// Summary
const allOk = !ce && !qe && !ae && customer && qr && ap && !ap.recovered_at;
console.log(
  allOk
    ? "\n✓ All three rows present. abandoned_plans recovered_at is null (correctly scheduled)."
    : "\n✗ One or more checks failed — see errors above.",
);

if (!allOk) process.exit(1);
