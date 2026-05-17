import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Check which OAuth providers are enabled in Supabase.
 * Returns { google: boolean, ... }
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: 'Supabase config missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to initiate a Google OAuth flow. If Google is disabled, Supabase returns a specific error.
    // We catch that to determine provider status, but don't actually redirect.
    // Note: This is a bit of a hack—there's no official "check provider" API in Supabase.
    // We detect availability by attempting sign-in and checking the error type.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'http://localhost/dummy' }, // dummy URL, we won't use this
    });

    // If no error, Google is enabled (we got a URL to redirect to)
    if (!error) {
      return Response.json({ google: true });
    }

    // If error message contains "provider", "disabled", or "not enabled", Google is disabled
    const errorMsg = error?.message?.toLowerCase() || '';
    const isDisabled =
      errorMsg.includes('provider') ||
      errorMsg.includes('disabled') ||
      errorMsg.includes('not enabled') ||
      errorMsg.includes('unsupported');

    return Response.json({ google: !isDisabled });
  } catch (err) {
    // If we get here, assume all providers are unavailable
    console.error('Error checking OAuth providers:', err);
    return Response.json({ google: false }, { status: 200 });
  }
}
