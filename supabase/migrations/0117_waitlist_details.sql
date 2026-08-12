-- The Suth Club waiting list grows up: a name for the text message, a
-- mobile to send it to, and what they want out of it so Ben opens the
-- conversation already knowing.
alter table public.waitlist
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists goal text;
