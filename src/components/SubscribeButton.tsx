'use client';
import { useState } from 'react';
import type { Plan } from '@/lib/stripe';

interface Props { plan?: Plan; label?: string; variant?: 'primary' | 'secondary' }

export function SubscribeButton({ plan = 'monthly', label, variant = 'primary' }: Props) {
  const [busy, setBusy] = useState(false);
  const defaultLabel = plan === 'yearly' ? 'Subscribe — €48/year' : 'Subscribe — €5/month';
  async function go() {
    setBusy(true);
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url; else setBusy(false);
  }
  const cls = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  return <button onClick={go} disabled={busy} className={`${cls} w-full`}>{busy ? 'Loading…' : (label ?? defaultLabel)}</button>;
}
