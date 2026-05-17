# CLAUDE.md — Security Baseline & Project Conventions

This document describes the automated security posture, development guidelines, and automated checks that protect VersionLens.

---

## GitHub Actions Security Baseline

The following automated workflows run on every push and PR:

### 1. CodeQL (Static Analysis)
- **Trigger:** Push to main, PRs, weekly schedule
- **What it does:** Scans for security vulnerabilities (SQL injection, XSS, command injection, etc.)
- **Language:** JavaScript/TypeScript (via `javascript` query suite)
- **Retention:** 90 days

### 2. Dependabot (Dependency Automation)
- **Trigger:** Weekly scan of `package.json`, `package-lock.json`, `Dockerfile`
- **What it does:**
  - Opens PRs automatically when new versions are available
  - Configured to auto-merge patch and minor updates to non-dev dependencies
  - Manual review required for major version bumps
  - Separate grouping for dev vs. prod dependencies to keep PRs focused
- **Security updates:** Opened immediately and can be auto-merged regardless of version

### 3. npm Audit (Supply Chain)
- **Trigger:** On every push and PR
- **What it does:** Runs `npm audit` and fails if high/critical vulns are found in dependencies
- **Allows:** Low and moderate vulns with explicit audit exceptions in `npm audit exceptions` (if used)

### 4. Type Check & Build (CI)
- **Trigger:** On every push and PR
- **What it does:**
  - Runs `npm run typecheck` (via `tsc --noEmit`)
  - Runs `npm run build` (Next.js build)
  - Catches breaking changes, typos, and incompatibilities before merge
- **Required to pass** before merge

### 5. Inference Engine Regression Suite
- **Trigger:** On every push and PR
- **What it does:** Runs `npx tsx scripts/test-inference.ts` (hand-curated corpus of 32 commit messages)
- **Threshold:** Must maintain ≥90% classification accuracy
- **Exit code:** 1 if accuracy drops, blocking the build

---

## Branch Protection

**main** branch is protected with:
- ✅ Require PR reviews before merge (1 approval, preferably)
- ✅ Dismiss stale PR approvals when new commits are pushed
- ✅ Require status checks to pass:
  - `build` (TypeScript + Next.js)
  - `test-inference` (keyword classifier)
  - `codeql` (security scan)
  - `npm-audit` (supply chain)
- ✅ Require branches to be up to date before merge
- ✅ Restrict who can push to main (code owners only)

**Note:** Branch protection rules are configured via GitHub Settings UI (cannot be auto-configured via Actions or API). Admin must set them up manually once.

---

## Development Conventions

### Commits

- **Message format:** Atomic, descriptive English sentences
- **Example:** `Replace LLM fallback with deterministic keyword classifier` (not "fix stuff")
- **Scope:** Commits should be reviewable in <400 lines of diff when possible
- **Linked PRs:** Use "Closes #123" in PR body to auto-link and auto-close issues

### Pull Requests

- **Title:** Present tense, ≤70 chars. Examples:
  - `Add IP-anchored anonymous quota`
  - `Fix race condition in cache writer`
  - `Replace Anthropic LLM with in-house classifier`
- **Body:** Markdown summary with:
  - **Summary:** 1–3 bullets on what changed and why
  - **Test plan:** Checklist of what was tested (manual or automated)
  - Relevant issue links
- **Draft PRs:** Use for work-in-progress; convert to ready-for-review when complete
- **Auto-merge:** Can be enabled on Dependabot PRs (patch/minor) so human reviewers don't block routine updates

### Code Style

- **Linting:** Prettier + TypeScript strict mode (via `npm run typecheck`)
- **Naming:** camelCase for variables/functions, PascalCase for components/types
- **Comments:** Only the "WHY" when non-obvious (not "WHAT" — self-documenting code is better)
- **Error handling:** Validate at system boundaries (user input, external APIs); trust internal functions
- **Security:** No hardcoded secrets, no `eval()`, sanitize user-supplied strings in UI (`word-break: anywhere`)

### API & Database

- **TypeScript:** All application code is strictly typed (`noImplicitAny`, `noUncheckedIndexedAccess`)
- **RLS:** Supabase Row Level Security policies protect user data (visible in `supabase/migrations/001_init.sql`)
- **Migrations:** All schema changes are versioned (e.g., `002_anon_ip_hash.sql`, `003_inference_source.sql`)
- **Caching:** Use Supabase's built-in cache (commit_classifications) to avoid redundant work

### Third-Party Services

- **Anthropic API:** Now optional. Only used when `ANTHROPIC_API_KEY` is set AND the in-house classifier marks a commit as `low` confidence
- **Stripe:** Production webhook configured to only accept signed events (webhook secret verified server-side)
- **Google OAuth:** Supabase manages tokens and RLS enforcement; app never sees raw credentials

---

## Security Checklist (Pre-Deploy)

Before deploying to production (CapRover or any public instance):

- [ ] All secrets are in CapRover env vars (never in code or .env files)
- [ ] Database migrations have run successfully (`001_init.sql`, `002_anon_ip_hash.sql`, `003_inference_source.sql`)
- [ ] RLS policies are enforced (check Supabase → Auth → Policies)
- [ ] Stripe webhook signing secret is configured and verified
- [ ] Google OAuth credentials are set in Supabase
- [ ] Main branch is green (all CI checks passing)
- [ ] No high/critical vulnerabilities in `npm audit`
- [ ] Inference engine is ≥90% accurate (`npm run build && npx tsx scripts/test-inference.ts`)

---

## Making Safe Changes

### Adding a Dependency
1. Run `npm install <package>`
2. Ensure it's a legitimate, well-maintained package (check GitHub stars, issue response time)
3. Commit the updated `package-lock.json`
4. PR runs npm audit automatically — fix any new vulns

### Modifying the Inference Engine
1. Add test cases to `scripts/test-inference.ts` for the new rule(s)
2. Update `src/lib/inference.ts`
3. Run `npx tsx scripts/test-inference.ts` locally to verify ≥90% accuracy
4. PR runs the test automatically — must pass

### Updating Database Schema
1. Create a new migration file in `supabase/migrations/` (e.g., `004_add_column.sql`)
2. Follow the naming pattern: `NNN_description.sql` (zero-padded, numbered sequentially)
3. Include idempotent operations: `CREATE TABLE IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`, etc.
4. Test in a local/dev Supabase project first
5. Document the migration in `DEPLOY.md`

### Rotating Secrets
If any credential is exposed:
1. **Immediately revoke** the old credential (Stripe API key, Anthropic key, Supabase JWT, etc.)
2. Generate a new one
3. Update CapRover env vars
4. Redeploy
5. Monitor logs for auth failures

---

## Reporting Security Issues

If you discover a vulnerability:
1. **Do not** open a public GitHub issue
2. **Do** email the maintainer(s) with:
   - Description and severity (CVE if applicable)
   - Steps to reproduce (if applicable)
   - Suggested fix (if you have one)
3. Allow 7 days for a response before public disclosure

---

## Deployment Pipeline

1. **Local development:** `npm run dev` on localhost:3000 with `.env.local`
2. **CI checks on PR:** TypeScript, Next.js build, inference tests, CodeQL, npm audit
3. **Manual code review:** At least 1 human approver
4. **Merge to main:** Automatic via auto-merge or manual click
5. **Production deploy:** Push Dockerfile to CapRover via `docker build` or git-based deploy
6. **Verify on production:** Smoke tests (scan a repo, verify quota gates, check Stripe webhook)

---

## Useful Commands

```bash
# Local development
npm run dev              # Start Next.js dev server on localhost:3000
npm run build            # Production build (checks TypeScript)
npm run typecheck        # Run TypeScript compiler in check mode

# Testing
npm run test-inference   # Run inference engine regression suite
npm audit                # Check for vulnerabilities

# Database (local Supabase)
npx supabase start       # Start local Supabase stack
npx supabase db push     # Apply pending migrations

# Git workflow
git fetch origin main
git checkout -b my-feature
# ... make changes ...
git push -u origin my-feature  # Open PR from the branch
```

---

## FAQ

**Q: Why is the Anthropic API optional?**
A: The in-house keyword classifier (tier 3) handles ~97% of real commits. The LLM is now tier 4 and only runs on the small subset marked `low` confidence. This saves costs, reduces privacy leakage, and removes the hard dependency on an external API.

**Q: How do I test a new rule in the inference engine?**
A: Add a test case to `scripts/test-inference.ts`, run it locally to verify accuracy is still ≥90%, then commit and push. The CI suite runs it automatically.

**Q: What if Dependabot opens a major-version PR?**
A: Review the changelog for breaking changes, update the code if needed, manually approve and merge. Major-version bumps require human judgment.

**Q: Can I commit directly to main?**
A: No. All changes go through a PR with at least 1 review + passing CI checks.

**Q: How do I add a new env var?**
A: Add it to `DEPLOY.md`, `SETUP_EXTERNAL_SERVICES.md`, and `.env.example` (with a comment explaining what it's for), so deployments know what to set.

---

Last updated: 2026-05-17
