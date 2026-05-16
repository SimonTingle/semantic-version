import Link from 'next/link';
import { SignInButton } from '@/components/SignInButton';
import { supabaseServer } from '@/lib/supabase/server';
import { SubscribeButton } from '@/components/SubscribeButton';

export default async function Pricing() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();

  return (
    <div className="pt-10 sm:pt-16">
      <header className="text-center max-w-2xl mx-auto px-2">
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">Simple pricing</h1>
        <p className="mt-3 text-ink-300">Try one scan free, no sign-in. Sign in for a second. Then €5/month (or save 20% yearly) for everything.</p>
      </header>

      <section className="mt-10 grid gap-4 sm:gap-6 lg:grid-cols-4">
        <Tier
          name="Free (anonymous)"
          price="€0"
          tagline="No sign-in required"
          features={['1 free scan', 'Inferred version', 'No exports']}
          cta={<Link href="/" className="btn-secondary w-full">Try it</Link>}
        />
        <Tier
          name="Signed in"
          price="€0"
          tagline="One Google sign-in"
          features={['2 scans total', 'CHANGELOG.md export', 'Shareable badge']}
          cta={user ? <Link href="/" className="btn-secondary w-full">Run a scan</Link> : <SignInButton variant="secondary" label="Sign in with Google" />}
        />
        <Tier
          name="Pro monthly"
          price="€5/mo"
          tagline="Everything unlocked"
          features={['Unlimited scans', 'Compare any two refs', 'Deep scan up to 10k commits', 'Cached intelligence', 'Cancel any time']}
          cta={user ? <SubscribeButton plan="monthly" /> : <SignInButton variant="primary" label="Sign in to subscribe" />}
          highlight
        />
        <Tier
          name="Pro yearly"
          price="€48/yr"
          tagline="2 months free"
          badge="Save 20%"
          features={['Everything in Pro monthly', 'Billed yearly', 'Cancel any time']}
          cta={user ? <SubscribeButton plan="yearly" variant="secondary" label="Subscribe — €48/year" /> : <SignInButton variant="secondary" label="Sign in to subscribe" />}
        />
      </section>

      <p className="text-center mt-10 text-xs text-ink-400">VAT may apply by jurisdiction. Billing handled by Stripe.</p>
    </div>
  );
}

function Tier({ name, price, tagline, features, cta, highlight, badge }: { name: string; price: string; tagline: string; features: string[]; cta: React.ReactNode; highlight?: boolean; badge?: string }) {
  return (
    <div className={`card p-6 flex flex-col relative ${highlight ? 'border-accent/40 shadow-glow' : ''}`}>
      {badge && <span className="absolute -top-2 right-4 chip bg-accent text-white text-[10px] tracking-wide uppercase">{badge}</span>}
      <p className="text-sm text-ink-400">{name}</p>
      <p className="mt-1 text-3xl font-semibold tabular">{price}</p>
      <p className="text-xs text-ink-400">{tagline}</p>
      <ul className="mt-5 space-y-2 text-sm text-ink-200 flex-1">
        {features.map((f) => <li key={f}>· {f}</li>)}
      </ul>
      <div className="mt-5">{cta}</div>
    </div>
  );
}
