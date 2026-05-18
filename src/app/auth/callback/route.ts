import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const next = url.searchParams.get('next') ?? '/';
    console.log('[auth/callback] code:', code ? 'present' : 'missing', 'next:', next);

    if (code) {
      const sb = await supabaseServer();
      console.log('[auth/callback] exchanging code for session...');
      const { data, error } = await sb.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('[auth/callback] exchange failed:', error.message);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      console.log('[auth/callback] exchange succeeded');
    }

    console.log('[auth/callback] redirecting to:', next);
    return NextResponse.redirect(new URL(next, url.origin));
  } catch (err) {
    console.error('[auth/callback] error:', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: 'Auth callback failed' }, { status: 500 });
  }
}
