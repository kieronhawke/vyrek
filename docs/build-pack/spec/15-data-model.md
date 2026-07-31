# DATA MODEL

Postgres. Every table has `id uuid pk default gen_random_uuid()`, `created_at`, `updated_at`.
Soft delete via `deleted_at` where noted. UK GDPR notes marked ⚠️.

---

## IDENTITY & ACCESS

```sql
users                      -- admin-side: Kieron, Ben, staff
  email citext unique, name, phone, avatar_url
  role enum('owner','coach','staff','readonly')
  two_factor_enabled bool, last_login_at, deleted_at

accounts                   -- client-side
  email citext unique, name, phone, avatar_url, dob, timezone
  country, city
  coach_id fk users null
  hub_status enum('none','trialing','active','past_due','cancelled')
  programming_status enum('none','active','paused')
  one_to_one_status enum('none','active','paused')
  one_to_one_tier enum('coaching','elite') null
  stripe_customer_id
  sms_opt_in bool, sms_opt_in_at, sms_opt_out_at
  email_marketing_opt_in bool
  health_consent_at timestamptz            -- ⚠️ Art 9 explicit consent
  deleted_at, anonymised_at                -- ⚠️ anonymise, never hard delete

sessions_auth              -- login sessions
  user_id | account_id, token_hash, ip, user_agent, expires_at, revoked_at
```

---

## LEADS

```sql
leads
  name, email, phone, source, campaign, referrer_url, landing_page
  segment enum('beginner','hyrox','faster','unsure')
  status enum('new','contacted','qualified','call_booked','trial','won','lost')
  call_outcome enum('signed_1to1','signed_programming','downsold_hub',
                    'follow_up','not_a_fit','no_show') null
  lost_reason, converted_account_id fk accounts null
  quiz_response_id fk, first_contacted_at, assigned_to fk users

quiz_responses
  lead_id | account_id, branch enum('beginner','hyrox')
  answers jsonb, completed bool, abandoned_at_screen int
  predicted_finish_seconds int, percentile numeric
  call_prep_sheet jsonb                    -- generated for Ben
```

---

## CLIENT PROFILE

```sql
client_profiles
  account_id fk unique
  goal, target_race_id fk, target_time_seconds int
  training_days_per_week int, session_length_minutes int
  gym_name, equipment jsonb                -- {ski_erg:true, sled:false, ...}
  unavailable_days text[]                  -- ["tuesday"]
  running_background jsonb, strength_background jsonb
  weak_stations text[]
  ⚠️ injuries text, conditions text, medications text, limitations text
  -- encrypted at rest, read access logged

client_commercials
  account_id fk unique
  monthly_rate_pence int, currency char(3)
  billing_method enum('stripe_auto','stripe_manual','offline')
  billing_next_date date
  programming_cadence enum('weekly','fortnightly','monthly','race_led')
  programmed_until date                    -- ← Ben's key field
  programming_status enum('current','due_soon','overdue','awaiting_race_debrief')
  rate_locked bool, rate_note              -- grandfathered rates

notes
  account_id | lead_id, author_id fk users, body, pinned bool
```

---

## PLANS

```sql
plans
  account_id fk, title, goal
  block_start date, block_end date
  status enum('draft','sent','active','completed','superseded')
  coach_note text NOT NULL                 -- ⚠️ human-written, blocks send if empty
  coach_note_dictated bool
  created_from_plan_id fk null, template_id fk null
  version int, sent_at, first_opened_at, open_count int

plan_weeks     plan_id, week_number, focus, notes
plan_sessions  plan_week_id, day_of_week, title, type, notes, order_index
plan_exercises plan_session_id, exercise_id fk, sets, reps, weight_kg,
               distance_m, duration_s, rpe, rest_s, notes, order_index

exercises      name, station enum null, video_url, thumbnail_url,
               cues text[], substitutions jsonb

plan_templates  name, owner_id fk users, structure jsonb, tags text[]
                -- Ben's block library

plan_exports    plan_id, format enum('pdf','xlsx','ics'), file_url,
                generated_at, downloaded_at, download_count

plan_comments   plan_session_id, author_type enum('client','coach'),
                author_id, body, read_at
```

---

## RACES

```sql
races          name, city, country, venue, starts_on, ends_on,
               division_options text[], external_id

race_entries   account_id fk, race_id fk
               division, priority enum('A','B','C')
               target_time_seconds, result_time_seconds
               splits jsonb, debrief_note, debrief_at

race_conflicts plan_id, detected_at, severity, description,
               options jsonb, chosen_option int, resolved_by fk users
```

---

## TRAINING LOG

```sql
workout_logs
  account_id, plan_session_id fk null
  started_at, completed_at, rpe int, feeling int, note
  source enum('web','ios','android','apple_watch','garmin')
  synced_at, client_generated_id text unique   -- ← idempotency for offline queue

workout_sets
  workout_log_id, exercise_id, set_number
  reps, weight_kg, distance_m, duration_s, rest_s, completed bool

benchmarks
  account_id, station, value_seconds, recorded_at, source
  is_pb bool, percentile numeric
```

---

## COMMERCE

```sql
subscriptions
  account_id, tier enum('hub','programming','coaching','elite')
  stripe_subscription_id, status, current_period_start, current_period_end
  cancel_at_period_end bool, cancelled_at, paused_until
  amount_pence, currency, interval enum('month','year')

payments
  account_id, subscription_id fk null
  amount_pence, currency, status enum('pending','paid','failed','refunded')
  method enum('card','link','cash','bank_transfer','other')
  is_offline bool, offline_reference, offline_marked_by fk users
  stripe_payment_intent_id, due_date, paid_at, failed_reason
  refunded_amount_pence, refund_reason

payment_links  account_id, amount_pence, stripe_link_url,
               sent_at, sent_via text[], opened_at, paid_at, expires_at

dunning_events payment_id, step int, channel, template_id fk,
               sent_at, responded_at, escalated_to_human bool
```

---

## COMMUNICATIONS

```sql
message_templates
  name, category, channel enum('sms','email','both')
  classification enum('transactional','marketing') NOT NULL   -- ⚠️ PECR
  subject, body, merge_fields text[], version int, active bool

messages
  account_id | lead_id, channel, direction enum('out','in')
  template_id fk null, automation_rule_id fk null
  sender_id fk users null                  -- null = system
  subject, body
  status enum('queued','sent','delivered','failed','bounced')
  provider_message_id, cost_pence
  sent_at, delivered_at, read_at, failed_reason

conversations  account_id, last_message_at, unread_count_coach, unread_count_client
```

---

## DIARY

```sql
appointments
  account_id fk null, coach_id fk users
  type enum('consultation','review','coaching_session','race','personal','blocked')
  title, starts_at, ends_at, timezone, location, video_url
  status enum('scheduled','confirmed','completed','cancelled','no_show')
  google_event_id, notes, reminder_sent_at

availability_rules  coach_id, day_of_week, start_time, end_time,
                    buffer_minutes, appointment_type
```

---

## AI ASSISTANT

```sql
assistant_conversations  account_id, started_at, message_count, escalated_to_coach bool
assistant_messages       conversation_id, role enum('user','assistant'),
                         content, tokens_used, blocked_reason null
```

---

## FORM REVIEW (Tier 3)

```sql
form_reviews
  account_id, station, video_url, duration_s, uploaded_at
  status enum('pending','reviewed')
  reviewed_by fk users, reviewed_at
  voice_note_url, text_note
```

---

## ANALYTICS

```sql
web_sessions
  visitor_id uuid, account_id fk null
  started_at, ended_at, duration_s
  entry_url, exit_url, referrer_url
  utm_source, utm_medium, utm_campaign, utm_term, utm_content
  device_type, browser, os
  country, region, city
  ⚠️ ip_address inet, ip_truncated_at    -- truncate last octet after 30 days
  converted bool, conversion_type

page_views
  session_id fk, url, path, title
  entered_at, exited_at, time_on_page_s, scroll_depth_pct

events  session_id, account_id null, name, properties jsonb, occurred_at

security_events
  type enum('failed_login','new_country','rapid_submit','shared_device',
            'unusual_export','admin_out_of_hours')
  user_id | account_id, ip, details jsonb, resolved_at, resolved_by
```

---

## AUTOMATION

```sql
automation_rules
  name, trigger_type, conditions jsonb, actions jsonb
  cooldown_hours int, active bool, paused_by fk users null

automation_runs
  rule_id, account_id, triggered_at, actions_taken jsonb,
  skipped_reason null, dry_run bool
```

---

## SEO

```sql
keywords
  keyword unique, segment, buyer_type, intent
  volume, kd_percent, cpc_usd, opportunity_score, priority, cluster
  target_page_id fk null, status
  -- seeded from data/keywords.csv

pages
  path unique, title, meta_description, page_class
  published_at, uniqueness_score int, uniqueness_fields_populated text[]
  blocked_reason null

rank_history  keyword_id, position, recorded_on, url
```

---

## LOCATIONS

```sql
locations
  slug unique, name, country, region, county, population, lat, lng
  nearest_race_id fk, travel_minutes_drive, travel_minutes_train
  local_athlete_count, local_median_seconds, local_fastest_seconds
  running_routes jsonb, parkruns jsonb, run_clubs jsonb
  bens_take text                          -- ← human-written, blocks publish if empty
  uniqueness_score int, published bool

location_gyms
  location_id, name, address, lat, lng
  is_affiliated bool, chain
  equipment jsonb, verified_at, verified_by
```

---

## AUDIT — APPEND ONLY

```sql
audit_log
  actor_type enum('user','account','system')
  actor_id, action, entity_type, entity_id
  before jsonb, after jsonb, reason, ip_address, user_agent
  occurred_at
  -- NO UPDATE, NO DELETE. Enforce with a database trigger.

data_access_log            -- ⚠️ Art 9 requirement
  actor_id, account_id, fields_accessed text[], occurred_at
```

---

## INDEXES — DO NOT SKIP

```sql
create index on accounts (hub_status) where deleted_at is null;
create index on client_commercials (programmed_until);
create index on client_commercials (billing_next_date);
create index on payments (account_id, due_date) where status != 'paid';
create index on messages (account_id, sent_at desc);
create index on web_sessions (visitor_id, started_at desc);
create index on page_views (session_id, entered_at);
create index on workout_logs (account_id, started_at desc);
create index on audit_log (entity_type, entity_id, occurred_at desc);
create unique index on workout_logs (client_generated_id);
```

---

## RETENTION

| Data | Retention |
|---|---|
| ⚠️ Health data | Duration of relationship + 12 months, then purge |
| ⚠️ IP addresses | 30 days full, then truncate final octet |
| Web sessions | 25 months (GA4 parity) |
| Messages | 6 years (dispute evidence) |
| Financial records | **6 years — HMRC. Survives erasure requests.** |
| Audit log | 6 years |
| Assistant conversations | 12 months |
