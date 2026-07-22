-- Workout Challenge Tracker — Supabase schema
-- Run this in the Supabase SQL editor (or via supabase db push).

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Workouts (photo evidence required at app layer; photo_url is not null)
-- ---------------------------------------------------------------------------
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  workout_date date not null,
  exercise_type text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  photo_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists workouts_user_id_idx on public.workouts (user_id);
create index if not exists workouts_workout_date_idx on public.workouts (workout_date);
create index if not exists workouts_user_date_idx on public.workouts (user_id, workout_date);

-- Optional cache of weekly summaries. Source of truth is still workouts +
-- the pure calculateYearTotals() function in the app; this table is for
-- faster leaderboard reads if you later add a sync job.
create table if not exists public.weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  distinct_workout_days integer not null default 0,
  total_workouts integer not null default 0,
  has_double_day boolean not null default false,
  credit_earned integer not null default 0,
  raw_missed_days integer not null default 0,
  credits_used integer not null default 0,
  final_missed_days integer not null default 0,
  money_owed_mxn integer not null default 0,
  banked_credits_after integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Athlete'),
    new.raw_user_meta_data->>'avatar_url'
  );
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

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — group of friends: all authenticated users can read
-- everyone's profiles/workouts; users can only write their own.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.weekly_summaries enable row level security;

create policy "Profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Workouts are readable by authenticated users"
  on public.workouts for select
  to authenticated
  using (true);

create policy "Users can insert their own workouts"
  on public.workouts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own workouts"
  on public.workouts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own workouts"
  on public.workouts for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Weekly summaries readable by authenticated users"
  on public.weekly_summaries for select
  to authenticated
  using (true);

create policy "Users can upsert their own weekly summaries"
  on public.weekly_summaries for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket for workout evidence photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('workout-photos', 'workout-photos', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload workout photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'workout-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Anyone can view workout photos"
  on storage.objects for select
  to public
  using (bucket_id = 'workout-photos');

create policy "Users can update their own workout photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'workout-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own workout photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'workout-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
