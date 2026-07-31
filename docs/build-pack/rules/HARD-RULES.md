# HARD RULES — NON-NEGOTIABLE

If a task appears to require breaking one of these, stop and write it to QUESTIONS.md.

---

## 1. NO FABRICATED ANYTHING
No invented testimonials, fake logos, made-up statistics, placeholder counters presented as
real, or illustrative reviews. Not even as temporary placeholder content. Fabricated proof
was already stripped from this codebase once. If real proof doesn't exist, leave the space
empty or write honest copy.

## 2. NEVER LOSE A WORKOUT
Local-first writes. Offline queue. Idempotent sync via `client_generated_id`. The UI never
waits on the network and never blocks on failure. The offline test (spec/16 §2) passes on
every commit.

## 3. THE COACH'S NOTE IS HUMAN
Mandatory on every plan. Human-typed or dictated. **No AI-assist button, no template picker,
no generate option.** Blocks send when empty. Minimum ~30 words. The moment an AI-assist
button exists it gets used every time and the entire personal-brand premise collapses.

## 4. NEVER AUTO-SEND ANYTHING THAT PRETENDS TO BE PERSONAL
The system MAY send: receipts, reminders, plan-ready notifications, payment links.
The system MAY prompt Ben to send: congratulations, check-ins, race-week messages.
The system MAY NOT auto-send anything presenting itself as Ben's personal thought.

Make automated messages look automated, so that when Ben writes, it's unmistakably him.

## 5. THE AI ASSISTANT IS NEVER BEN
Distinct name ("Ask SUV"), distinct identity, never his photo, never signed as him. Every
response carries the assistant footer. "Ask Ben about this" escalation always visible.
Read-only on plans. Hard-blocked on injury advice, medical questions, race decisions, and
restrictive nutrition. Full adversarial suite in spec/16 §8.

## 6. NEVER AUTO-CANCEL FOR NON-PAYMENT
The dunning ladder escalates to a human decision at day 10 and suggests *pause*, not cancel,
at day 14. Someone struggling financially who gets treated well comes back.

## 7. NO PAGE WITHOUT UNIQUE DATA
The uniqueness validator is a pre-publish gate. Minimum 5 populated fields including one gym
and one results data point. **Do not add a bypass flag.** Remove one if it exists.

## 8. HEALTH DATA IS SPECIAL CATEGORY DATA
UK GDPR Article 9. Explicit consent captured separately at collection, timestamped.
Encrypted at rest. Every read written to `data_access_log`. Defined retention.

## 9. ERASURE ANONYMISES, IT DOESN'T DELETE
Financial records must survive for 6 years (HMRC). Strip identity, contact and health data;
retain the financial record against an anonymised ID. A hard-delete cascade will either break
Finance or breach retention.

## 10. TRANSACTIONAL EMAIL STAYS OFF THE ROOT DOMAIN
All automated sending from `mail.suvathletic.com` with its own SPF/DKIM. Never create a
`noreply@` address.

## 11. SMS COMPLIANCE IS FUNCTIONAL, NOT OPTIONAL
Every template classified transactional or marketing — the field is NOT NULL. STOP handling
immediate and automatic. Quiet hours 21:00–08:00 recipient local. Global per-account daily
message cap.

## 12. HYROX TRADEMARK
Descriptive use only. Never imply affiliation. Never use their logo. Never register a domain
containing "hyrox". Footer disclaimer present.

## 13. ZERO HORIZONTAL SCROLL
At any breakpoint, on any page, on any device in the matrix. Automated gate.

## 14. INCREMENTAL DEPLOYMENT
Preview first. Ship in stages. Surface risks in specific items rather than shipping batches
wholesale — especially quiz and onboarding changes, where conversion telemetry doesn't exist
yet to catch regressions.
