-- Inbound client SMS replies. Previously these were logged and dropped; the
-- client believed they'd told Ben and Ben never saw it. Now every verified
-- reply lands here and surfaces in the admin messages inbox.
--
-- message_sid is Twilio's per-message id and is unique, so a Twilio retry
-- upserts the same row instead of duplicating it.
create table if not exists inbound_messages (
  id           uuid primary key default gen_random_uuid(),
  from_number  text not null,
  body         text not null,
  message_sid  text unique,
  -- Best-effort link to a known customer (by phone), populated later; kept
  -- nullable so an unknown number still records the message.
  customer_id  uuid references customers(id) on delete set null,
  handled      boolean not null default false,
  received_at  timestamptz not null default now()
);

create index if not exists inbound_messages_received_idx
  on inbound_messages (received_at desc);
