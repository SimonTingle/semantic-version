-- VersionLens schema
-- Run via `supabase db push` or paste into the SQL editor.

create extension if not exists "pgcrypto";

-- Per-user profile mirrors auth.users and stores billing state.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text,           -- active | trialing | canceled | past_due | null
  scans_used int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Per-scan record. One row per (user, repo) scan invocation.
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  anon_fingerprint text,              -- set for not-signed-in scans (IP+UA hash)
  owner text not null,
  repo text not null,
  inferred_version text not null,
  commits_analyzed int not null,
  ai_calls int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists scans_user_idx on public.scans (user_id, created_at desc);
create index if not exists scans_anon_idx on public.scans (anon_fingerprint, created_at desc);
create index if not exists scans_repo_idx on public.scans (owner, repo, created_at desc);

-- Per-commit classification cache. Shared across users: same SHA = same answer.
create table if not exists public.commit_classifications (
  repo_full_name text not null,
  sha text not null,
  bump text not null check (bump in ('major','minor','patch','none')),
  source text not null check (source in ('heuristic','ai')),
  message_excerpt text,
  created_at timestamptz not null default now(),
  primary key (repo_full_name, sha)
);
create index if not exists commit_class_repo_idx on public.commit_classifications (repo_full_name);

-- RLS
alter table public.profiles enable row level security;
alter table public.scans enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "scans self read" on public.scans;
create policy "scans self read" on public.scans
  for select using (auth.uid() = user_id);

-- commit_classifications is server-only (no RLS policies => only service-role writes).
-- Service role from API routes bypasses RLS.

-- Auto-create a profile row when a new auth user appears.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
