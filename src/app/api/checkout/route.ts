import { NextResponse } from 'next/server';
import { stripe, priceFor, type Plan } from '@/lib/stripe';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign in first' }, { status: 401 });

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'server misconfigured' }, { status: 500 });

  let plan: Plan = 'monthly';
  try {
    const body = await req.json();
    if (body?.plan === 'yearly') plan = 'yearly';
  } catch { /* empty body is fine */ }

  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .maybeSingle();

  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe().customers.create({
      email: user.email ?? profile?.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL('/', 'http://localhost:3000').origin;
  const session = await stripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceFor(plan), quantity: 1 }],
    success_url: `${origin}/account?checkout=success`,
    cancel_url: `${origin}/pricing?checkout=cancelled`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
