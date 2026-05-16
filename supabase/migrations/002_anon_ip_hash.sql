-- Close the incognito re-roll loophole on the anonymous free scan.
-- The cookie-based fingerprint is the strong signal; this is a weaker
-- secondary check that survives a fresh browser profile from the same network.

alter table public.scans add column if not exists anon_ip_hash text;
create index if not exists scans_anon_ip_idx on public.scans (anon_ip_hash, created_at desc);
