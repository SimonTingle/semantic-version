-- Add admin flag to profiles table for test/owner accounts with unlimited access
alter table public.profiles
  add column is_admin boolean not null default false;

-- Index for efficient admin queries
create index if not exists profiles_is_admin_idx on public.profiles (is_admin);

-- To grant admin access to a user after they sign in:
-- UPDATE public.profiles SET is_admin = true WHERE email = 'user@example.com';
