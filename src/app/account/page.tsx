import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SignOutButton } from '@/components/SignOutButton';
import { SubscribeButton } from '@/components/SubscribeButton';

export default async function Account() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/pricing');

  const admin = supabaseAdmin();
  const { data: profile } = admin
    ? await admin.from('profiles').select('subscription_status, stripe_customer_id').eq('id', user.id).maybeSingle()
    : { data: null as { subscription_status: string | null; stripe_customer_id: string | null } | null };

  const { count: scanCount } = admin
    ? await admin.from('scans').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    : { count: 0 };

  const subscribed = ['active', 'trialing'].includes(profile?.subscription_status ?? '');

  return (
    <div className="pt-10 sm:pt-14 max-w-2xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Your account</h1>
      <p className="mt-1 text-sm text-ink-400 word-break">{user.email}</p>

      <div className="card mt-6 p-5 sm:p-6 space-y-4">
        <Row label="Plan" value={subscribed ? 'Pro — €5/month' : 'Free'} />
        <Row label="Scans run" value={String(scanCount ?? 0)} />
        <Row label="Subscription status" value={profile?.subscription_status ?? '—'} />
      </div>

      <div className="mt-6 flex gap-2">
        {!subscribed && <SubscribeButton />}
        <Link href="/" className="btn-secondary flex-1">Run a scan</Link>
      </div>

      <div className="mt-10">
        <SignOutButton />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 flex-wrap">
      <span className="text-sm text-ink-400">{label}</span>
      <span className="font-medium tabular word-break">{value}</span>
    </div>
  );
}
