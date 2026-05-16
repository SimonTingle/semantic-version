import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import { SignInButton } from './SignInButton';

export async function Header() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-ink-950/70 border-b border-ink-800/60">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="inline-block h-6 w-6 rounded-lg bg-gradient-to-br from-accent-400 to-accent-700 shadow-glow" />
          <span>VersionLens</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2 text-sm">
          <Link className="btn-ghost" href="/pricing">Pricing</Link>
          {user ? (
            <Link className="btn-secondary" href="/account">Account</Link>
          ) : (
            <SignInButton variant="secondary" label="Sign in" />
          )}
        </nav>
      </div>
    </header>
  );
}
