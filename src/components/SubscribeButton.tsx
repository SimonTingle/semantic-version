'use client';
import { useState } from 'react';

export function SubscribeButton({ label = 'Subscribe — €5/month' }: { label?: string }) {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const res = await fetch('/api/checkout', { method: 'POST' });
    const data = await res.json();
    if (data.url) window.location.href = data.url; else setBusy(false);
  }
  return <button onClick={go} disabled={busy} className="btn-primary w-full">{busy ? 'Loading…' : label}</button>;
}
