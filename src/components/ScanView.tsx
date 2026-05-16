'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PaywallModal } from './PaywallModal';
import type { ScanResult, Bump } from '@/lib/types';

interface QuotaDecision {
  allowed: boolean;
  reason: string;
  scansUsed: number;
  limit: number | null;
}

interface Props {
  owner: string;
  repo: string;
  defaultBranch: string;
  description: string | null;
  avatarUrl: string | null;
  stars: number;
}

export function ScanView({ owner, repo, defaultBranch, description, avatarUrl, stars }: Props) {
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'done' | 'paywall' | 'error'>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [paywall, setPaywall] = useState<{ reason: 'needs-sign-in' | 'needs-subscription'; scansUsed: number; limit: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [base, setBase] = useState('');
  const [head, setHead] = useState('');
  const ranOnce = useRef(false);

  async function scan(compareBase?: string, compareHead?: string) {
    setPhase('scanning'); setError(null);
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ owner, repo, base: compareBase || undefined, head: compareHead || undefined }),
    });
    const data = await res.json();
    if (res.status === 402) {
      const d = data.decision as QuotaDecision;
      setPaywall({ reason: d.reason as 'needs-sign-in' | 'needs-subscription', scansUsed: d.scansUsed, limit: d.limit ?? 0 });
      setPhase('paywall');
      return;
    }
    if (!res.ok) {
      setError(data.error ?? 'scan failed'); setPhase('error'); return;
    }
    setResult(data.result as ScanResult);
    setPhase('done');
  }

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pt-6 sm:pt-10">
      <RepoHeader owner={owner} repo={repo} description={description} avatarUrl={avatarUrl} stars={stars} defaultBranch={defaultBranch} />

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-5 sm:p-8 relative overflow-hidden">
          {phase === 'scanning' && <ScanProgress />}
          {phase === 'error' && <p className="text-red-400 text-sm word-break">{error}</p>}
          {phase === 'done' && result && <VersionDisplay result={result} />}
        </div>
        <div className="card p-5 sm:p-6 space-y-5">
          <ComparePanel onCompare={(b, h) => { setBase(b); setHead(h); scan(b, h); }} base={base} head={head} defaultBranch={defaultBranch} />
          {result && <BadgeSnippet owner={owner} repo={repo} />}
          {result && <ChangelogButton owner={owner} repo={repo} commits={result.classifications} />}
        </div>
      </div>

      {phase === 'done' && result && <Timeline result={result} />}

      {paywall && (
        <PaywallModal
          reason={paywall.reason}
          scansUsed={paywall.scansUsed}
          limit={paywall.limit}
          next={`/${owner}/${repo}`}
          onClose={() => setPaywall(null)}
        />
      )}
    </div>
  );
}

function RepoHeader({ owner, repo, description, avatarUrl, stars, defaultBranch }: { owner: string; repo: string; description: string | null; avatarUrl: string | null; stars: number; defaultBranch: string }) {
  return (
    <header className="flex items-start gap-4 flex-wrap">
      {avatarUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={owner} width={48} height={48} className="h-12 w-12 rounded-xl border border-ink-700 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink-400 word-break">{owner}</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight word-break">{repo}</h1>
        {description && <p className="text-sm text-ink-300 mt-1 word-break">{description}</p>}
      </div>
      <div className="flex gap-2 shrink-0">
        <span className="chip bg-ink-800 text-ink-300 tabular">★ {stars}</span>
        <span className="chip bg-ink-800 text-ink-300">{defaultBranch}</span>
      </div>
    </header>
  );
}

function ScanProgress() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-300">Walking commit history…</p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-800">
        <div className="h-full w-1/3 animate-[loading_1.6s_ease-in-out_infinite] bg-gradient-to-r from-accent/40 via-accent to-accent/40 rounded-full"
             style={{ animationName: 'vlpulse' }} />
      </div>
      <ul className="text-xs text-ink-400 space-y-1">
        <li>· Heuristic-classifying Conventional Commits</li>
        <li>· Routing ambiguous commits to Claude</li>
        <li>· Caching by SHA — re-scans will be instant</li>
      </ul>
      <style>{`@keyframes vlpulse {0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
    </div>
  );
}

function VersionDisplay({ result }: { result: ScanResult }) {
  const cached = result.classifications.filter((c) => c.source === 'cache').length;
  return (
    <div className="animate-fade-in">
      <p className="text-sm text-ink-400">Inferred semantic version</p>
      <p className="mt-1 font-mono tabular text-5xl sm:text-7xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-accent-400 via-cyan-300 to-accent-400 word-break">
        {result.inferredVersion}
      </p>
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Stat label="Commits" value={result.commitsAnalyzed.toLocaleString()} />
        <Stat label="AI calls" value={result.aiCalls.toLocaleString()} />
        <Stat label="From cache" value={cached.toLocaleString()} />
        <Stat label="Releases" value={result.timeline.length.toLocaleString()} />
      </div>
      {result.truncated && (
        <p className="mt-4 text-xs text-amber-300/90">
          History truncated at 1,000 commits — earlier history is ignored. Subscribers can unlock deeper history.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900/60 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-ink-400">{label}</p>
      <p className="text-base font-medium tabular">{value}</p>
    </div>
  );
}

function ComparePanel({ onCompare, base, head, defaultBranch }: { onCompare: (b: string, h: string) => void; base: string; head: string; defaultBranch: string }) {
  const [b, setB] = useState(base);
  const [h, setH] = useState(head || defaultBranch);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onCompare(b.trim(), h.trim()); }}>
      <h3 className="font-medium tracking-tight">Compare two refs</h3>
      <p className="text-xs text-ink-400 mt-1">e.g. <code>v1.2.0</code> → <code>HEAD</code>. Leave base empty to scan full history.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <input className="input py-2 text-sm" placeholder="base (e.g. v1.2.0)" value={b} onChange={(e) => setB(e.target.value)} />
        <input className="input py-2 text-sm" placeholder={`head (default: ${defaultBranch})`} value={h} onChange={(e) => setH(e.target.value)} />
      </div>
      <button type="submit" className="btn-secondary mt-3 w-full">Compare</button>
    </form>
  );
}

function BadgeSnippet({ owner, repo }: { owner: string; repo: string }) {
  const url = `/api/badge/${owner}/${repo}`;
  const md = `[![version](${url})](${typeof window !== 'undefined' ? window.location.origin : ''}/${owner}/${repo})`;
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <h3 className="font-medium tracking-tight">Shareable badge</h3>
      <div className="mt-2 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="version badge" />
      </div>
      <button
        className="btn-secondary mt-3 w-full text-xs"
        onClick={() => { navigator.clipboard.writeText(md); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      >{copied ? 'Copied!' : 'Copy markdown'}</button>
    </div>
  );
}

function ChangelogButton({ owner, repo, commits }: { owner: string; repo: string; commits: ScanResult['classifications'] }) {
  function download() {
    const text = generate(`${owner}/${repo}`, commits);
    const blob = new Blob([text], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'CHANGELOG.md';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <div>
      <h3 className="font-medium tracking-tight">Export</h3>
      <button onClick={download} className="btn-primary mt-2 w-full">Download CHANGELOG.md</button>
    </div>
  );
}

function generate(full: string, commits: ScanResult['classifications']): string {
  // mirrors lib/changelog.ts but runs client-side from data already in memory
  const LABEL: Record<Bump, string> = { major: 'Breaking', minor: 'Added', patch: 'Fixed', none: 'Internal' };
  let v = '0.0.0';
  const groups = new Map<string, ScanResult['classifications']>();
  const bumpFn = (cur: string, b: Bump) => {
    const [M, m, p] = cur.split('.').map(Number);
    if (b === 'major') return M === 0 ? `0.${m + 1}.0` : `${M + 1}.0.0`;
    if (b === 'minor') return `${M}.${m + 1}.0`;
    if (b === 'patch') return `${M}.${m}.${p + 1}`;
    return cur;
  };
  for (const c of commits) {
    const next = bumpFn(v, c.bump);
    const k = next === v ? v : next;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(c);
    v = next;
  }
  const out: string[] = [`# Changelog — ${full}`, '', 'Inferred semver history. Generated by VersionLens.', ''];
  for (const k of [...groups.keys()].reverse()) {
    out.push(`## ${k}`);
    const bk: Record<Bump, string[]> = { major: [], minor: [], patch: [], none: [] };
    for (const c of groups.get(k)!) bk[c.bump].push(`- ${c.message.split('\n', 1)[0]} (\`${c.sha.slice(0, 7)}\`)`);
    for (const b of ['major', 'minor', 'patch', 'none'] as Bump[]) {
      if (bk[b].length === 0) continue;
      out.push('', `### ${LABEL[b]}`, ...bk[b]);
    }
    out.push('');
  }
  return out.join('\n');
}

function Timeline({ result }: { result: ScanResult }) {
  const items = useMemo(() => [...result.timeline].reverse().slice(0, 50), [result]);
  if (items.length === 0) return null;
  return (
    <section className="mt-6 card p-5 sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">Version timeline</h2>
      <p className="text-xs text-ink-400 mt-1">Most recent 50 version bumps, newest first.</p>
      <ol className="mt-4 space-y-2">
        {items.map((t) => (
          <li key={t.sha} className="flex items-start gap-3 text-sm">
            <span className={`chip shrink-0 ${badgeFor(t.bump)} tabular`}>{t.version}</span>
            <span className="text-ink-300 word-break">{t.message}</span>
            <code className="ml-auto text-xs text-ink-500 shrink-0">{t.sha.slice(0, 7)}</code>
          </li>
        ))}
      </ol>
    </section>
  );
}

function badgeFor(b: Bump): string {
  switch (b) {
    case 'major': return 'bg-red-500/15 text-red-300 border border-red-500/30';
    case 'minor': return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
    case 'patch': return 'bg-sky-500/15 text-sky-300 border border-sky-500/30';
    default: return 'bg-ink-800 text-ink-300 border border-ink-700';
  }
}
