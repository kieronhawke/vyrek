-- Coach Mode becomes real: training plans Ben writes and sends, and the
-- one-way messages he fires off from the gym floor. Both belong to a
-- customer; both are written only through admin server actions.

-- A name on the customer itself. It has lived in auth user_metadata,
-- which is one admin API call per person — fine for login, useless for
-- a client list. Activation writes it from here on.
alter table public.customers
  add column if not exists full_name text;

create table if not exists public.training_plans (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null default '',
  week_start date not null,
  -- How many days the plan covers, so "programmed until" is derivable.
  days integer not null default 7,
  -- [{ day: "Monday", focus: "Intervals", detail: "..." }, ...]
  content jsonb not null default '[]'::jsonb,
  -- Ben's note on top: the human bit above the sessions.
  note text,
  status text not null default 'draft' check (status in ('draft', 'sent')),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_plans_customer_idx
  on public.training_plans (customer_id, week_start desc);

alter table public.training_plans enable row level security;

create table if not exists public.client_messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  channel text not null check (channel in ('email', 'sms')),
  subject text,
  body text not null,
  sent_by text not null default 'coach',
  created_at timestamptz not null default now()
);

create index if not exists client_messages_customer_idx
  on public.client_messages (customer_id, created_at desc);

alter table public.client_messages enable row level security;
