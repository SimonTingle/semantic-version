import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { loadQuotaContext, decide } from '@/lib/quota';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();

  if (!user) return Response.json({ error: 'not signed in' }, { status: 401 });

  const admin = supabaseAdmin();
  const rawProfile = admin
    ? await admin.from('profiles').select('*').eq('id', user.id).maybeSingle()
    : null;

  const ctx = await loadQuotaContext();
  const decision = decide(ctx);

  return Response.json({
    userId: user.id,
    email: user.email,
    rawProfile: rawProfile?.data,
    quotaCtx: ctx,
    decision,
  });
}
