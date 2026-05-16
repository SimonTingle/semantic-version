'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SearchBar() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\/$/, '');
    if (!v) return;
    setBusy(true);
    // Accepts `username` or `username/repo`
    if (v.includes('/')) {
      const [owner, repo] = v.split('/', 2);
      router.push(`/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
    } else {
      router.push(`/${encodeURIComponent(v)}`);
    }
  }

  return (
    <form onSubmit={onSubmit} className="relative w-full">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <span aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input
            type="text"
            inputMode="search"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="GitHub username or owner/repo"
            aria-label="GitHub username or owner/repo"
            className="input pl-11 text-base sm:text-lg"
          />
        </div>
        <button type="submit" disabled={busy} className="btn-primary text-base px-6 py-3 sm:py-0 sm:h-[3.25rem]">
          {busy ? 'Loading…' : 'Analyze'}
        </button>
      </div>
      <p className="mt-2 text-xs text-ink-400">Try <button type="button" className="underline hover:text-ink-200" onClick={() => setValue('vercel/next.js')}>vercel/next.js</button> or <button type="button" className="underline hover:text-ink-200" onClick={() => setValue('sindresorhus')}>sindresorhus</button>.</p>
    </form>
  );
}
