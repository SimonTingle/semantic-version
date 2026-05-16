'use client';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const router = useRouter();
  async function out() {
    await supabaseBrowser().auth.signOut();
    router.push('/');
    router.refresh();
  }
  return <button className="btn-ghost text-sm" onClick={out}>Sign out</button>;
}
