# VersionLens

Infer the semantic version of any public GitHub repo by walking its commit history.
Conventional Commits first, then an in-house deterministic keyword classifier, with
the Anthropic Claude API as an optional fallback for genuinely ambiguous commits.
Starts from `0.0.0`.

## Stack
- Next.js 14 (App Router, TypeScript, standalone build)
- Tailwind CSS — modern dark UI, mobile-first
- Supabase — Postgres + Google OAuth + RLS
- In-house keyword inference engine — deterministic, free, private
- Anthropic Claude API — **optional** fallback for low-confidence commits
- Stripe — €5/month subscription
- Octokit — GitHub REST API

## Quotas
- 1st scan: free, anonymous (IP/UA fingerprint cookie)
- 2nd scan: free, requires Google sign-in
- 3rd+ scan: Pro subscription (€5/month)

Defaults are configurable via `FREE_ANON_SCANS` and `FREE_SIGNED_IN_SCANS` env vars.

## Local dev

```
cp .env.example .env.local
# fill in Supabase, Anthropic, Stripe keys
npm install
npm run dev
```

See `DEPLOY.md` for CapRover + Supabase + Stripe setup.

## Architecture

Classification pipeline: `cache → heuristic → inference → ai`. Each tier owns
the commits the previous tier passed on.

- `src/lib/heuristic.ts` — Conventional Commits classifier (free, instant).
- `src/lib/inference.ts` — deterministic keyword classifier with confidence scoring. Covers breaking phrases, feature/patch verbs, doc/test/CI signals, etc.
- `src/lib/ai.ts` — optional Claude fallback. Only runs when `ANTHROPIC_API_KEY` is set, and only for commits the inference engine marked `low` confidence.
- `src/lib/semver.ts` — chronological version walk from `0.0.0`. Pre-1.0 repos use the conservative `0.x` rule (breaking → minor).
- `src/lib/scan.ts` — orchestrator: GitHub fetch → cache check → heuristic → inference → optional AI → compute version → persist.
- `commit_classifications` table caches every SHA → bump answer. Re-scans are free.

## Known limits in v1
- Public repos only. Private-repo support requires a GitHub App with `Contents: Read-only` and `Metadata: Read-only`; the codebase leaves a seam for this (`fetchCommits` accepts a token).
- History capped at 1,000 commits per scan.
- Anonymous GitHub API requests are rate-limited to 60/hr per IP. Set `GITHUB_TOKEN` server-side to lift this.
