'use client';
import { SignInButton } from './SignInButton';

interface Props {
  reason: 'needs-sign-in' | 'needs-subscription';
  scansUsed: number;
  limit: number;
  next?: string;
  onClose?: () => void;
}

export function PaywallModal({ reason, scansUsed, limit, next, onClose }: Props) {
  async function checkout() {
    const res = await fetch('/api/checkout', { method: 'POST' });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }
  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="card relative max-w-md w-full p-6 sm:p-8 animate-fade-in">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
          {reason === 'needs-sign-in' ? 'You used your free scan' : 'Time to subscribe'}
        </h2>
        <p className="mt-2 text-sm text-ink-300">
          {scansUsed} / {limit} scans used.{' '}
          {reason === 'needs-sign-in'
            ? 'Sign in with Google for one more free scan, then €5/month for unlimited.'
            : 'You’re on the free tier. Unlimited scans, cached intelligence, CHANGELOG export and compare-mode for €5/month.'}
        </p>
        <ul className="mt-4 space-y-2 text-sm text-ink-200">
          <li className="flex items-start gap-2"><Bullet /> Unlimited repo scans</li>
          <li className="flex items-start gap-2"><Bullet /> Re-scans hit cache: near-instant + no AI cost</li>
          <li className="flex items-start gap-2"><Bullet /> CHANGELOG.md export and shields badge</li>
          <li className="flex items-start gap-2"><Bullet /> Compare any two refs (“v1.2.0 → HEAD”)</li>
        </ul>
        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          {reason === 'needs-sign-in' ? (
            <SignInButton variant="primary" label="Continue with Google" next={next ?? '/'} />
          ) : (
            <button className="btn-primary flex-1" onClick={checkout}>Subscribe — €5/month</button>
          )}
          {onClose && <button className="btn-ghost" onClick={onClose}>Maybe later</button>}
        </div>
      </div>
    </div>
  );
}

function Bullet() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent mt-0.5 shrink-0">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
