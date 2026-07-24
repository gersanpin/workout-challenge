-- Fortachones — Supabase schema
-- Run in the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- Groups
-- ---------------------------------------------------------------------------
create table if not exists public.challenge_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Fortachones',
  invite_code text not null unique,
  photo_url text,
  challenge_started_on date,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  height_m numeric(4,2),
  weight_kg numeric(5,2),
  age_years integer,
  goal_type text check (goal_type in ('gain_weight', 'lose_weight', 'improve_exercise')),
  goal_exercise text,
  food_preference text check (food_preference in ('omnivore', 'vegetarian', 'vegan', 'carnivore', 'pescatarian')),
  is_admin boolean not null default false,
  group_id uuid references public.challenge_groups (id) on delete set null,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Soft-add columns if upgrading from earlier schema
alter table public.profiles add column if not exists height_m numeric(4,2);
alter table public.profiles add column if not exists weight_kg numeric(5,2);
alter table public.profiles add column if not exists age_years integer;
alter table public.profiles add column if not exists goal_type text;
alter table public.challenge_groups add column if not exists photo_url text;
alter table public.challenge_groups add column if not exists challenge_started_on date;
alter table public.profiles add column if not exists goal_exercise text;
alter table public.profiles add column if not exists food_preference text;
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists group_id uuid references public.challenge_groups (id) on delete set null;
alter table public.profiles add column if not exists removed_at timestamptz;

-- ---------------------------------------------------------------------------
-- Workouts (duration removed; photo required; media_type for future video)
-- ---------------------------------------------------------------------------
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  workout_date date not null,
  exercise_type text not null,
  photo_url text not null,
  media_type text not null default 'photo' check (media_type in ('photo', 'video')),
  created_at timestamptz not null default now()
);

alter table public.workouts add column if not exists media_type text not null default 'photo';
alter table public.workouts drop column if exists duration_minutes;

create index if not exists workouts_user_id_idx on public.workouts (user_id);
create index if not exists workouts_workout_date_idx on public.workouts (workout_date);
create index if not exists workouts_created_at_idx on public.workouts (created_at desc);

-- ---------------------------------------------------------------------------
-- Comments on workouts (feed)
-- ---------------------------------------------------------------------------
create table if not exists public.workout_comments (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists workout_comments_workout_id_idx
  on public.workout_comments (workout_id, created_at);

-- ---------------------------------------------------------------------------
-- Group chat
-- ---------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.challenge_groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text,
  media_url text,
  media_type text check (media_type in ('text', 'gif', 'image', 'link')),
  link_url text,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_group_id_idx
  on public.chat_messages (group_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Activity / public notifications in feed
-- ---------------------------------------------------------------------------
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.challenge_groups (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  event_type text not null check (event_type in ('workout', 'week_complete', 'credit_banked', 'week_missed', 'system')),
  title text not null,
  body text,
  workout_id uuid references public.workouts (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Weight history
-- ---------------------------------------------------------------------------
create table if not exists public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  weight_kg numeric(5,2) not null,
  recorded_on date not null default (current_date),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Coach chat (personal sports/nutrition agent)
-- ---------------------------------------------------------------------------
create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  goal_section text not null,
  food_section text not null,
  plan_json jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.weekly_plans add column if not exists plan_json jsonb;

alter table public.chat_messages add column if not exists workout_id uuid references public.workouts (id) on delete set null;

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

alter table public.weekly_plans enable row level security;

drop policy if exists "Own weekly plans" on public.weekly_plans;
create policy "Own weekly plans"
  on public.weekly_plans for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- Auth trigger
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
returns trigger language plpgsql as $$
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
-- RLS
-- ---------------------------------------------------------------------------
alter table public.challenge_groups enable row level security;
alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_comments enable row level security;
alter table public.chat_messages enable row level security;
alter table public.activity_events enable row level security;
alter table public.weight_entries enable row level security;
alter table public.coach_messages enable row level security;
alter table public.weekly_summaries enable row level security;

-- Helper: same group
create or replace function public.same_group(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles me
    join public.profiles other on other.id = target
    where me.id = auth.uid()
      and me.group_id is not null
      and me.group_id = other.group_id
      and me.removed_at is null
      and other.removed_at is null
  );
$$;

create or replace function public.my_group_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select group_id from public.profiles where id = auth.uid() and removed_at is null;
$$;

create or replace function public.am_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Groups
drop policy if exists "Groups readable by members" on public.challenge_groups;
create policy "Groups readable by members"
  on public.challenge_groups for select to authenticated
  using (id = public.my_group_id() or created_by = auth.uid());

drop policy if exists "Authenticated can create groups" on public.challenge_groups;
create policy "Authenticated can create groups"
  on public.challenge_groups for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists "Admins update groups" on public.challenge_groups;
create policy "Admins update groups"
  on public.challenge_groups for update to authenticated
  using (id = public.my_group_id() and public.am_admin());

-- Profiles
drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
drop policy if exists "Profiles readable in group" on public.profiles;
create policy "Profiles readable in group"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or (group_id is not null and group_id = public.my_group_id())
  );

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id or public.am_admin())
  with check (auth.uid() = id or public.am_admin());

-- Workouts
drop policy if exists "Workouts are readable by authenticated users" on public.workouts;
drop policy if exists "Workouts readable in group" on public.workouts;
create policy "Workouts readable in group"
  on public.workouts for select to authenticated
  using (public.same_group(user_id) or user_id = auth.uid());

drop policy if exists "Users can insert their own workouts" on public.workouts;
create policy "Users can insert their own workouts"
  on public.workouts for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own workouts" on public.workouts;
create policy "Users can update their own workouts"
  on public.workouts for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own workouts" on public.workouts;
create policy "Users can delete their own workouts"
  on public.workouts for delete to authenticated
  using (auth.uid() = user_id);

-- Comments
drop policy if exists "Comments readable in group" on public.workout_comments;
create policy "Comments readable in group"
  on public.workout_comments for select to authenticated
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id and (w.user_id = auth.uid() or public.same_group(w.user_id))
    )
  );

drop policy if exists "Members can comment" on public.workout_comments;
create policy "Members can comment"
  on public.workout_comments for insert to authenticated
  with check (auth.uid() = user_id);

-- Chat
drop policy if exists "Chat readable in group" on public.chat_messages;
create policy "Chat readable in group"
  on public.chat_messages for select to authenticated
  using (group_id = public.my_group_id());

drop policy if exists "Members can chat" on public.chat_messages;
create policy "Members can chat"
  on public.chat_messages for insert to authenticated
  with check (group_id = public.my_group_id() and user_id = auth.uid());

-- Activity
drop policy if exists "Activity readable in group" on public.activity_events;
create policy "Activity readable in group"
  on public.activity_events for select to authenticated
  using (group_id = public.my_group_id());

drop policy if exists "Members insert activity" on public.activity_events;
create policy "Members insert activity"
  on public.activity_events for insert to authenticated
  with check (group_id = public.my_group_id());

-- Weight
drop policy if exists "Own weight readable" on public.weight_entries;
create policy "Own weight readable"
  on public.weight_entries for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Own weight insert" on public.weight_entries;
create policy "Own weight insert"
  on public.weight_entries for insert to authenticated
  with check (user_id = auth.uid());

-- Coach
drop policy if exists "Own coach messages" on public.coach_messages;
create policy "Own coach messages"
  on public.coach_messages for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Weekly summaries
drop policy if exists "Weekly summaries readable by authenticated users" on public.weekly_summaries;
drop policy if exists "Weekly readable in group" on public.weekly_summaries;
create policy "Weekly readable in group"
  on public.weekly_summaries for select to authenticated
  using (user_id = auth.uid() or public.same_group(user_id));

drop policy if exists "Users can upsert their own weekly summaries" on public.weekly_summaries;
create policy "Users can upsert their own weekly summaries"
  on public.weekly_summaries for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('workout-photos', 'workout-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload workout photos" on storage.objects;
create policy "Authenticated users can upload workout photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('workout-photos', 'chat-media')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Anyone can view workout photos" on storage.objects;
create policy "Anyone can view workout photos"
  on storage.objects for select to public
  using (bucket_id in ('workout-photos', 'chat-media'));

drop policy if exists "Users can update their own workout photos" on storage.objects;
create policy "Users can update their own workout photos"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('workout-photos', 'chat-media')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own workout photos" on storage.objects;
create policy "Users can delete their own workout photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('workout-photos', 'chat-media')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
