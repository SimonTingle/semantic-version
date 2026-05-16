# Setting Up External Services for VersionLens

This guide walks through setting up Google Cloud (OAuth), Supabase (database + auth), and Stripe (payments) for a VersionLens deployment.

---

## 1. Google Cloud Platform (OAuth)

Google OAuth is used for user sign-in on VersionLens.

### 1.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the project dropdown at the top → **Select a Project** → **NEW PROJECT**
3. Name it (e.g., `VersionLens`) → **Create**
4. Wait for the project to initialize, then select it

### 1.2 Enable OAuth Consent Screen

1. In the left sidebar, go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type → **Create**
3. Fill in the form:
   - **App name:** VersionLens
   - **User support email:** your email
   - **Developer contact:** your email
4. **Save and Continue** → skip scopes → **Save and Continue** → **Back to Dashboard**

### 1.3 Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Choose application type: **Web application**
4. Under **Authorized redirect URIs**, add:
   ```
   https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
   ```
   (You'll get the exact URL from Supabase in step 2 below)
5. **Create** → a popup shows **Client ID** and **Client Secret**
6. **Copy both** — you'll need these for Supabase in 30 seconds

---

## 2. Supabase Setup

Supabase provides PostgreSQL database, Google OAuth integration, and row-level security.

### 2.1 Create a Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com) → Sign in (or create account)
2. Click **New Project**
3. Fill in:
   - **Name:** VersionLens (or similar)
   - **Database Password:** generate a strong password and save it
   - **Region:** pick one close to your users (e.g., eu-west-1 for Europe)
4. **Create new project** — wait ~2 minutes for it to initialize

### 2.2 Get Your Supabase URL & Keys

1. Once the project is ready, go to **Project Settings** (bottom-left icon) → **API**
2. You'll see three important values:
   ```
   Project URL          → NEXT_PUBLIC_SUPABASE_URL
   anon public key      → NEXT_PUBLIC_SUPABASE_ANON_KEY
   service_role secret  → SUPABASE_SERVICE_ROLE_KEY (never expose!)
   ```
3. **Copy these three values** — save them somewhere safe

### 2.3 Enable Google OAuth in Supabase

1. In Supabase, go to **Authentication** → **Providers** → **Google**
2. Toggle it **ON**
3. Paste the **Client ID** and **Client Secret** from GCP (step 1.3)
4. **Save** → you'll see a "Redirect URL" like `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
5. Go back to GCP (step 1.3) and add this exact URL to the **Authorized redirect URIs** if you haven't already

### 2.4 Configure Authentication URLs

Still in Supabase **Authentication**:

1. Go to **URL Configuration**
2. **Site URL:** `https://versionlens.example.com` (your final domain)
3. **Redirect URLs:** Add both:
   - `https://versionlens.example.com/auth/callback` (main app)
   - `https://versionlens.example.com` (fallback)
4. **Save**

### 2.5 Run Database Migrations

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy the entire contents of `supabase/migrations/001_init.sql` from the repo
4. Paste into the editor → **Run** (Ctrl+Enter)
5. Wait for success message
6. Create another query, paste `supabase/migrations/002_anon_ip_hash.sql` → **Run**
7. Both should complete without errors

---

## 3. Stripe Setup

Stripe handles recurring subscriptions (€5/month and €48/year).

### 3.1 Create a Stripe Account

1. Go to [stripe.com](https://stripe.com) → **Sign up**
2. Fill in your details and company info
3. Verify your email
4. Skip onboarding for now (you can do it later)

### 3.2 Create the Product & Prices

1. In Stripe Dashboard, go to **Products** (left sidebar)
2. Click **+ Add product**
3. Fill in:
   - **Name:** VersionLens Pro
   - **Description:** Unlock advanced scanning, deep scans, and 3D repo visualization
   - **Billing period:** Monthly and yearly (both on the same product)
4. Under **Standard pricing**, add two prices:
   - **Price 1:** €5 per month → **Save product**
   - After creation, go back to the product and add another price
   - **Price 2:** €48 per year
5. For each price, copy the **Price ID** (looks like `price_1ABC...`):
   - Monthly → `STRIPE_PRICE_ID`
   - Yearly → `STRIPE_YEARLY_PRICE_ID`

### 3.3 Get Your API Keys

1. Go to **Developers** → **API keys** (top right)
2. Make sure you're in **Live mode** (toggle at top-left)
3. Under **Secret key**, click **Reveal** (or **Copy** directly)
4. Copy this value → `STRIPE_SECRET_KEY` (starts with `sk_live_`)

### 3.4 Set Up the Webhook

1. Still in **Developers**, go to **Webhooks**
2. Click **+ Add endpoint**
3. Fill in:
   - **Endpoint URL:** `https://versionlens.example.com/api/stripe/webhook`
   - **Events:** Select the three events:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
4. **Add endpoint** → you'll see a **Signing secret**
5. Copy it → `STRIPE_WEBHOOK_SECRET` (starts with `whsec_`)

---

## 4. Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign in → go to **API Keys**
3. Click **Create Key**
4. Copy it → `ANTHROPIC_API_KEY` (starts with `sk-ant-`)
5. (Optional) Set `ANTHROPIC_MODEL=claude-haiku-4-5-20251001` in your environment if you want to override the default

---

## 5. GitHub Token (Optional but Recommended)

GitHub tokens lift the 60 requests/hour rate limit for free users.

1. Go to [github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta)
2. Click **Generate new token** (fine-grained)
3. Name it `VersionLens-API`
4. Under **Permissions**, set:
   - **Repository permissions** → **Contents: Read-only**
5. Under **Account permissions** → leave empty
6. Copy the token → `GITHUB_TOKEN`

---

## 6. Summary Table

Collect all values and fill in your CapRover environment:

| Variable | Source | Example |
|----------|--------|---------|
| `NEXT_PUBLIC_SITE_URL` | You set it | `https://versionlens.example.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API (anon) | `eyJ0eXAi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (service_role) | `eyJ0eXAi...` |
| `ANTHROPIC_API_KEY` | Anthropic Console → API Keys | `sk-ant-...` |
| `ANTHROPIC_MODEL` | (optional, defaults to Haiku) | `claude-haiku-4-5-20251001` |
| `GITHUB_TOKEN` | GitHub → Settings → Tokens (optional) | `ghp_...` |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API Keys (Secret) | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks | `whsec_...` |
| `STRIPE_PRICE_ID` | Stripe → Products → VersionLens Pro (monthly) | `price_1ABC...` |
| `STRIPE_YEARLY_PRICE_ID` | Stripe → Products → VersionLens Pro (yearly) | `price_1ABC...` |
| `FREE_ANON_SCANS` | (optional, defaults to 1) | `1` |
| `FREE_SIGNED_IN_SCANS` | (optional, defaults to 2) | `2` |

---

## 7. Smoke Test

Once CapRover is deployed with all env vars set:

### 7.1 Test Anonymous Scan (Free)
1. Open `https://versionlens.example.com`
2. Search for a repo (e.g., `vercel/next.js`)
3. **Scan** — should work, no sign-in required
4. Check browser cookies — you should see a `versionlens_quota` cookie with IP hash

### 7.2 Test Signed-In Scan (Free)
1. Click **Sign in with Google** → authorize
2. You're redirected back, signed in
3. Scan a second repo — should work (using your second free signed-in scan)

### 7.3 Test Paywall (Free quota exhausted)
1. Try a third scan — should show **PaywallModal** with:
   - "You've used your free scans"
   - Link to Stripe Checkout

### 7.4 Test Subscription
1. Click **Subscribe** in the paywall
2. You're redirected to Stripe Checkout (choose Monthly or Yearly)
3. Use Stripe's test card: `4242 4242 4242 4242` (exp: any future date, CVC: any 3 digits)
4. Complete the checkout
5. You're redirected back to VersionLens
6. Check Supabase: your profile should now have `subscription_status = 'active'`
   - Go to **SQL Editor** → `SELECT id, email, subscription_status FROM profiles WHERE email = 'your-email@example.com' LIMIT 1;`
7. Try scanning again — paywall should **disappear**, scan should work

### 7.5 Test Deep Scan (Pro feature)
1. Logged in as a Pro subscriber, run a scan
2. In **ScanView**, you should see a **"Deep scan"** toggle
3. Enable it → scan should analyze up to 10,000 commits (instead of 1,000)

### 7.6 Test 3D Repo Lens (Pro feature)
1. After a scan, you should see a **"3D repo lens"** card in the sidebar
2. Click **"Open 3D lens"** → a glassmorphic modal opens with an interactive 3D graph
3. Drag to orbit, scroll to zoom, click nodes to fly
4. Mobile users should see "3D lens is desktop-only" fallback

---

## Troubleshooting

### OAuth redirect loop
- **Issue:** Redirected back to sign-in after Google auth
- **Fix:** Check **Supabase → Authentication → URL Configuration**:
  - **Site URL** must match your actual domain
  - **Redirect URLs** must include `/auth/callback` path

### Stripe webhook not firing
- **Issue:** Subscription doesn't activate after checkout
- **Fix:** 
  - Check that webhook endpoint is reachable: `https://versionlens.example.com/api/stripe/webhook` (should return 200)
  - Verify **Signing secret** in CapRover matches Stripe Developers → Webhooks
  - Check CapRover logs for webhook errors

### Rate-limited GitHub API
- **Issue:** "API rate limit exceeded"
- **Fix:** Set `GITHUB_TOKEN` to a fine-grained PAT with read-only access

### Anthropic API errors
- **Issue:** "Invalid API key" or "Quota exceeded"
- **Fix:**
  - Verify key is correct in env vars
  - Check console.anthropic.com for usage and billing

---

## Cost Estimates (Monthly)

| Service | Free Tier | Usage | Typical Cost |
|---------|-----------|-------|--------------|
| **Supabase** | ✅ 2GB storage, 50k monthly API | Thousands of scans | $0 (free tier usually enough) |
| **Anthropic** | ❌ None | ~25 tokens per scan, cached | $0.01–0.05 per chaotic repo |
| **Stripe** | ✅ Signup free | Per transaction | 1.4–2.9% + €0.25 per charge |
| **Google Cloud** | ✅ Free tier | Just OAuth | $0 |

---

Done! Once all env vars are set in CapRover, deploy and run the smoke test above.
