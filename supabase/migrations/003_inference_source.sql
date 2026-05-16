-- Widen the source CHECK constraint on commit_classifications to include the
-- new deterministic keyword classifier (tier 3 between heuristic and AI).

alter table public.commit_classifications
  drop constraint if exists commit_classifications_source_check;

alter table public.commit_classifications
  add constraint commit_classifications_source_check
  check (source in ('heuristic','inference','ai'));
