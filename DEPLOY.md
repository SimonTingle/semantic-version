# Deploying VersionLens to CapRover

VersionLens ships as a single Docker image with a multi-stage build that emits a
Next.js standalone server. CapRover builds the image straight from this repo.

## 1. Supabase

1. Create a Supabase project.
2. **Authentication → Providers → Google**: enable it. In Google Cloud Console:
   - Create an OAuth 2.0 Client (Web application).
   - Add `https://<project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI.
   - Copy Client ID + Secret into the Supabase Google provider form.
3. **SQL editor**: run, in order, `supabase/migrations/001_init.sql`, `supabase/migrations/002_anon_ip_hash.sql`, then `supabase/migrations/003_inference_source.sql`.
4. Copy these from **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose)
5. **Authentication → URL Configuration**: set Site URL to your CapRover domain (e.g. `https://versionlens.example.com`) and add `https://versionlens.example.com/auth/callback` to the Redirect URLs allow-list.

## 2. Stripe

1. Create a Product **VersionLens Pro** with two recurring prices on the same product:
   - €5 / month → copy the price id → `STRIPE_PRICE_ID`
   - €48 / year → copy the price id → `STRIPE_YEARLY_PRICE_ID`
2. From **Developers → API keys**: copy the secret key → `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks → Add endpoint** → `https://versionlens.example.com/api/stripe/webhook`. Subscribe to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   Copy the signing secret → `STRIPE_WEBHOOK_SECRET`.

## 3. Anthropic (optional)

VersionLens v0.2 ships with a deterministic in-house keyword classifier that
handles non-conventional commits without an LLM. The Anthropic API is now an
**optional** fallback — set `ANTHROPIC_API_KEY` only if you want LLM precision
for the small subset of commits the classifier marks as low-confidence.

If you want to enable it: create an API key at console.anthropic.com →
`ANTHROPIC_API_KEY`. Default model is `claude-haiku-4-5-20251001` (fast +
cheap). Override with `ANTHROPIC_MODEL` if needed. Leave `ANTHROPIC_API_KEY`
blank to disable the LLM entirely.

## 4. GitHub (optional but recommended)

Create a fine-grained PAT with **read-only public repository contents** access.
Set it as `GITHUB_TOKEN` server-side. This lifts the 60 req/hr/IP limit so free-tier users don't hit rate limits.

## 5. CapRover

1. In the CapRover dashboard, create a new app (e.g. `versionlens`). Enable HTTPS.
2. **App Configs → Container HTTP Port**: `3000`.
3. **App Configs → Environment Variables**: paste every key from `.env.example` (with your real values).
4. **Deployment → Method 3: Deploy from GitHub**: point it at this repo's branch. CapRover finds `captain-definition`, which builds the `Dockerfile`.
5. Trigger a deploy. First build takes ~3 minutes.

## 6. Smoke test

1. Open `https://versionlens.example.com`. Scan `vercel/next.js` (it's a large repo and a great stress test).
2. Sign in with Google → run a second scan (signed-in free tier).
3. Try a third → paywall should show.
4. Subscribe via the Stripe Checkout link → after redirect, the webhook flips your profile to `subscription_status = 'active'` and the paywall disappears.

## Costs to watch
- Supabase free tier handles many thousands of scans.
- Anthropic: ~one prompt-cached system message + ~25 commit messages per request. A 1,000-commit scan with all commits in cache costs ~zero. A fresh scan of a chaotic repo costs roughly $0.005–$0.02 in Haiku tokens.
- Stripe: standard 1.4–2.9% + €0.25 per charge.

## Adding private-repo support (future)
Register a GitHub App with `Contents: Read-only` + `Metadata: Read-only`.
Wire its installation flow through Supabase, store the installation id per user,
and pass the resulting installation token to `fetchCommits({ token })` (the seam already exists).
