-- Stylish Family Salon. Run this first in Supabase > SQL Editor, then run seed.sql.

create table if not exists public.menu_sections (
  id        text primary key,
  audience  text not null check (audience in ('ladies', 'men')),
  title     text not null,
  icon      text not null default 'sparkle',
  cols      jsonb,                       -- e.g. ["Rika","Aloe","Choco"]; null for single-price lists
  sort      int  not null default 0
);

create table if not exists public.menu_items (
  id         bigint generated always as identity primary key,
  section_id text not null references public.menu_sections(id) on delete cascade,
  name       text not null,
  note       text,
  prices     jsonb not null,             -- array of numbers (null = not offered)
  sort       int  not null default 0
);
create index if not exists menu_items_section_idx on public.menu_items(section_id, sort);

create table if not exists public.bookings (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null,
  phone      text not null,
  email      text,
  for_whom   text not null check (for_whom in ('ladies', 'men')),
  service    text not null,
  date       date not null,
  time       text not null,
  notes      text,
  status     text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled'))
);
create index if not exists bookings_date_idx on public.bookings(date, time);

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null,
  phone      text,
  email      text,
  message    text not null
);

-- The browser never talks to Supabase directly. Only the Render API does, using the
-- service-role key (which bypasses RLS). RLS on with no policies locks everyone else out.
alter table public.menu_sections enable row level security;
alter table public.menu_items    enable row level security;
alter table public.bookings      enable row level security;
alter table public.messages      enable row level security;

-- ---------------------------------------------------------------------------------------------
-- Admin-managed content (run this block once, after the tables above exist)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.site_settings (
  key   text primary key,
  value jsonb not null default '{}'::jsonb
);

create table if not exists public.offers (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  title       text not null,
  badge       text not null,
  description text not null default '',
  items       jsonb not null default '[]'::jsonb,
  was         int,
  now         int,
  who         text not null default 'ladies' check (who in ('ladies', 'men')),
  ends        date not null,
  terms       text,
  active      boolean not null default true
);

create table if not exists public.gallery_images (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  url        text not null,
  path       text,
  caption    text not null default '',
  shape      text not null default '' check (shape in ('', 'tall', 'wide')),
  sort       int not null default 0
);

alter table public.site_settings  enable row level security;
alter table public.offers         enable row level security;
alter table public.gallery_images enable row level security;

-- Public bucket for photos uploaded from the admin page (uploads go through the API only).
insert into storage.buckets (id, name, public) values ('site-images', 'site-images', true)
on conflict (id) do nothing;
