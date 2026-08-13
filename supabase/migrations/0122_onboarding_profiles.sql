-- What a client tells us during onboarding — injuries, availability, coaching
-- style, goals, their photo. This was collected in the browser and then thrown
-- away: nothing reached the server, so Ben wrote week one blind and the UI's
-- "he has everything you sent" was untrue. Now it's persisted here, keyed by
-- email so it lines up with the customer created at activation.
--
-- The health fields (injuries, conditions) are Article 9 special-category
-- data; health_consent + health_consent_at record that the client provided it
-- after being shown the "only Ben sees this" notice.
create table if not exists onboarding_profiles (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique,
  name               text,
  invite_token       text,
  answers            jsonb not null default '{}'::jsonb,
  photo_data_url     text,
  health_consent     boolean not null default false,
  health_consent_at  timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists onboarding_profiles_email_idx
  on onboarding_profiles (email);
