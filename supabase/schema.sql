-- ===========================================================================
-- Stay Focused — Supabase schema
-- Run this whole file in the Supabase SQL editor (it is idempotent).
-- Every table is protected by row level security scoped to auth.uid().
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per authenticated user, mirrored by the app after changes.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  language text not null default 'en' check (language in ('en', 'ru', 'kk')),
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  budget_day date not null default current_date,
  time_left_seconds integer not null default 3600
    check (time_left_seconds between 0 and 86400),
  streak integer not null default 0 check (streak >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  last_streak_day date,
  energy_points integer not null default 30 check (energy_points >= 0),
  pet_name text not null default '',
  pet_happiness integer not null default 72
    check (pet_happiness between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- workout_logs: one row per completed, camera-verified set.
-- ---------------------------------------------------------------------------
create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise text not null check (exercise in ('pushup', 'squat', 'jumpingjack')),
  reps integer not null check (reps >= 0),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  reward_seconds integer not null default 1800 check (reward_seconds >= 0),
  energy integer not null default 20 check (energy >= 0),
  performed_at timestamptz not null default now(),
  day date not null default current_date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tasks: the calendar and focus plan.
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  date date not null,
  start_time time,
  duration_minutes integer not null default 30
    check (duration_minutes between 5 and 480),
  kind text not null default 'task' check (kind in ('focus', 'task', 'workout')),
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- daily_stats: aggregated per-day screen time and movement.
-- ---------------------------------------------------------------------------
create table if not exists public.daily_stats (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  screen_seconds integer not null default 0 check (screen_seconds >= 0),
  workout_seconds integer not null default 0 check (workout_seconds >= 0),
  reps integer not null default 0 check (reps >= 0),
  workouts integer not null default 0 check (workouts >= 0),
  tasks_done integer not null default 0 check (tasks_done >= 0),
  primary key (user_id, day)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists workout_logs_user_day_idx
  on public.workout_logs (user_id, day desc);
create index if not exists tasks_user_date_idx
  on public.tasks (user_id, date);
create index if not exists daily_stats_user_day_idx
  on public.daily_stats (user_id, day desc);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workout_logs enable row level security;
alter table public.tasks enable row level security;
alter table public.daily_stats enable row level security;

drop policy if exists "profiles: owner only" on public.profiles;
create policy "profiles: owner only" on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "workout_logs: owner only" on public.workout_logs;
create policy "workout_logs: owner only" on public.workout_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "tasks: owner only" on public.tasks;
create policy "tasks: owner only" on public.tasks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "daily_stats: owner only" on public.daily_stats;
create policy "daily_stats: owner only" on public.daily_stats
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Grants for the authenticated role (anon can only reach auth endpoints).
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.workout_logs to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.daily_stats to authenticated;

-- ---------------------------------------------------------------------------
-- Provision a profile whenever a new auth user (e.g. Google) appears.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users who signed up before this schema was applied.
insert into public.profiles (id, email, full_name, avatar_url)
select
  id,
  email,
  coalesce(
    raw_user_meta_data ->> 'full_name',
    raw_user_meta_data ->> 'name',
    split_part(coalesce(email, ''), '@', 1)
  ),
  raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Keep updated_at truthful.
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
