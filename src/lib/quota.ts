import { cookies, headers } from 'next/headers';
import { supabaseServer } from './supabase/server';
import { supabaseAdmin } from './supabase/admin';
import crypto from 'node:crypto';

const ANON_COOKIE = 'vl_anon';
const FREE_ANON = Number(process.env.FREE_ANON_SCANS ?? 1);
const FREE_SIGNED_IN = Number(process.env.FREE_SIGNED_IN_SCANS ?? 2);

export type QuotaDecision =
  | { allowed: true; reason: 'subscribed' | 'free-anon' | 'free-signed-in'; scansUsed: number; limit: number | null }
  | { allowed: false; reason: 'needs-sign-in' | 'needs-subscription'; scansUsed: number; limit: number };

export interface QuotaContext {
  userId: string | null;
  subscribed: boolean;
  anonFingerprint: string;
  scansUsed: number;
}

async function anonFingerprint(): Promise<string> {
  const c = await cookies();
  let id = c.get(ANON_COOKIE)?.value;
  if (!id) {
    id = crypto.randomUUID();
    try { c.set({ name: ANON_COOKIE, value: id, httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 }); } catch { /* RSC */ }
  }
  const h = await headers();
  const ua = h.get('user-agent') ?? '';
  return crypto.createHash('sha256').update(`${id}::${ua}`).digest('hex').slice(0, 32);
}

export async function loadQuotaContext(): Promise<QuotaContext> {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  const fp = await anonFingerprint();

  if (!user) {
    const admin = supabaseAdmin();
    let scansUsed = 0;
    if (admin) {
      const { count } = await admin
        .from('scans')
        .select('*', { count: 'exact', head: true })
        .eq('anon_fingerprint', fp);
      scansUsed = count ?? 0;
    }
    return { userId: null, subscribed: false, anonFingerprint: fp, scansUsed };
  }

  const admin = supabaseAdmin();
  let scansUsed = 0;
  let subscribed = false;
  if (admin) {
    const [profile, scanCount] = await Promise.all([
      admin.from('profiles').select('subscription_status').eq('id', user.id).maybeSingle(),
      admin.from('scans').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);
    subscribed = ['active', 'trialing'].includes(profile.data?.subscription_status ?? '');
    scansUsed = scanCount.count ?? 0;
  }
  return { userId: user.id, subscribed, anonFingerprint: fp, scansUsed };
}

export function decide(ctx: QuotaContext): QuotaDecision {
  if (ctx.subscribed) return { allowed: true, reason: 'subscribed', scansUsed: ctx.scansUsed, limit: null };

  if (!ctx.userId) {
    if (ctx.scansUsed < FREE_ANON) {
      return { allowed: true, reason: 'free-anon', scansUsed: ctx.scansUsed, limit: FREE_ANON };
    }
    return { allowed: false, reason: 'needs-sign-in', scansUsed: ctx.scansUsed, limit: FREE_ANON };
  }

  if (ctx.scansUsed < FREE_SIGNED_IN) {
    return { allowed: true, reason: 'free-signed-in', scansUsed: ctx.scansUsed, limit: FREE_SIGNED_IN };
  }
  return { allowed: false, reason: 'needs-subscription', scansUsed: ctx.scansUsed, limit: FREE_SIGNED_IN };
}

export async function recordScan(args: {
  ctx: QuotaContext;
  owner: string;
  repo: string;
  inferredVersion: string;
  commitsAnalyzed: number;
  aiCalls: number;
}) {
  const admin = supabaseAdmin();
  if (!admin) return;
  await admin.from('scans').insert({
    user_id: args.ctx.userId,
    anon_fingerprint: args.ctx.userId ? null : args.ctx.anonFingerprint,
    owner: args.owner,
    repo: args.repo,
    inferred_version: args.inferredVersion,
    commits_analyzed: args.commitsAnalyzed,
    ai_calls: args.aiCalls,
  });
}
