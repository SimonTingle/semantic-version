-- Add admin flag to profiles table for test users with unlimited access
alter table public.profiles
  add column is_admin boolean not null default false;

-- Index for efficient admin queries
create index if not exists profiles_is_admin_idx on public.profiles (is_admin);

-- Set tingleteaching@gmail.com as admin (will be auto-created on first sign-in)
-- After first login, run: UPDATE public.profiles SET is_admin = true WHERE email = 'tingleteaching@gmail.com';
