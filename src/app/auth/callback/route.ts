import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';
  if (code) {
    try {
      const sb = await supabaseServer();
      await sb.auth.exchangeCodeForSession(code);
      console.log('[auth/callback] exchange succeeded');
    } catch (err) {
      console.error('[auth/callback] exchange failed:', err instanceof Error ? err.message : String(err));
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
