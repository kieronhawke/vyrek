-- Ben's blog editor. A row here overrides (or hides, or adds to) the MDX
-- files committed under content/blog, so posts can be edited on the live
-- site without a deploy. Written only through admin server actions with
-- the service key; no public policies on purpose.
create table if not exists public.blog_posts (
  slug text primary key,
  status text not null default 'draft'
    check (status in ('published', 'draft', 'hidden')),
  title text not null default '',
  excerpt text not null default '',
  category text not null default 'training',
  tags jsonb not null default '[]'::jsonb,
  published_at date not null default current_date,
  author_slug text not null default 'suth-team',
  hero_image text,
  hero_alt text,
  seo_title text,
  seo_description text,
  featured boolean not null default false,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blog_posts enable row level security;
