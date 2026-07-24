-- Arquitecta schema — run in Supabase SQL editor
-- Enables Auth users → profiles, portfolios, assets, usage_events

create extension if not exists "pgcrypto";

-- Plans (reference; limits also enforced in app via lib/plans.ts)
create table if not exists public.plans (
  id text primary key,
  name text not null,
  max_portfolios int not null,
  max_published int not null,
  ai_credits_per_month int not null,
  pdf_exports_per_month int not null
);

insert into public.plans (id, name, max_portfolios, max_published, ai_credits_per_month, pdf_exports_per_month)
values
  ('free', 'Gratis', 1, 1, 20, 5),
  ('pro', 'Pro', 10, 10, 200, 50)
on conflict (id) do update set
  name = excluded.name,
  max_portfolios = excluded.max_portfolios,
  max_published = excluded.max_published,
  ai_credits_per_month = excluded.ai_credits_per_month,
  pdf_exports_per_month = excluded.pdf_exports_per_month;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  plan_id text not null default 'free' references public.plans (id),
  created_at timestamptz not null default now()
);

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Mi portafolio',
  slug text unique,
  template_id text not null default 'minimal',
  content jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portfolios_user_id_idx on public.portfolios (user_id);
create index if not exists portfolios_slug_idx on public.portfolios (slug) where published = true;

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  portfolio_id uuid references public.portfolios (id) on delete set null,
  kind text not null check (kind in ('image', 'pdf', 'other')),
  storage_path text not null,
  public_url text,
  file_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('ai', 'pdf_export')),
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_user_month_idx
  on public.usage_events (user_id, kind, created_at);

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, plan_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'free'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists portfolios_updated_at on public.portfolios;
create trigger portfolios_updated_at
  before update on public.portfolios
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.portfolios enable row level security;
alter table public.assets enable row level security;
alter table public.usage_events enable row level security;
alter table public.plans enable row level security;

drop policy if exists "plans readable" on public.plans;
create policy "plans readable" on public.plans for select using (true);

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "portfolios select own" on public.portfolios;
create policy "portfolios select own" on public.portfolios
  for select using (auth.uid() = user_id);

drop policy if exists "portfolios select published" on public.portfolios;
create policy "portfolios select published" on public.portfolios
  for select using (published = true);

drop policy if exists "portfolios insert own" on public.portfolios;
create policy "portfolios insert own" on public.portfolios
  for insert with check (auth.uid() = user_id);

drop policy if exists "portfolios update own" on public.portfolios;
create policy "portfolios update own" on public.portfolios
  for update using (auth.uid() = user_id);

drop policy if exists "portfolios delete own" on public.portfolios;
create policy "portfolios delete own" on public.portfolios
  for delete using (auth.uid() = user_id);

drop policy if exists "assets select own" on public.assets;
create policy "assets select own" on public.assets
  for select using (auth.uid() = user_id);

drop policy if exists "assets insert own" on public.assets;
create policy "assets insert own" on public.assets
  for insert with check (auth.uid() = user_id);

drop policy if exists "assets delete own" on public.assets;
create policy "assets delete own" on public.assets
  for delete using (auth.uid() = user_id);

drop policy if exists "usage select own" on public.usage_events;
create policy "usage select own" on public.usage_events
  for select using (auth.uid() = user_id);

drop policy if exists "usage insert own" on public.usage_events;
create policy "usage insert own" on public.usage_events
  for insert with check (auth.uid() = user_id);

-- Storage bucket (run after creating bucket `portfolio-assets` as public in dashboard)
-- insert into storage.buckets (id, name, public) values ('portfolio-assets', 'portfolio-assets', true)
-- on conflict do nothing;

-- Storage policies (adjust if bucket already has policies)
-- create policy "Users upload own folder"
-- on storage.objects for insert to authenticated
-- with check (bucket_id = 'portfolio-assets' and (storage.foldername(name))[1] = auth.uid()::text);

-- create policy "Users read own folder"
-- on storage.objects for select to authenticated
-- using (bucket_id = 'portfolio-assets' and (storage.foldername(name))[1] = auth.uid()::text);

-- create policy "Public read portfolio assets"
-- on storage.objects for select to public
-- using (bucket_id = 'portfolio-assets');
