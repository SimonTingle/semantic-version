'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { RepoGraph } from '@/lib/repoTree';
import { PaywallModal } from './PaywallModal';

const RepoStructureGraph = dynamic(() => import('./RepoStructureGraph'), {
  ssr: false,
  loading: () => <CanvasSkeleton />,
});

interface Props { owner: string; repo: string }

export function LensView({ owner, repo }: Props) {
  const router = useRouter();
  const [graph, setGraph] = useState<RepoGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGraph() {
      const res = await fetch(
        `/api/repo-tree?repo=${encodeURIComponent(`${owner}/${repo}`)}`,
        { signal: controller.signal },
      );
      if (res.status === 402) { setPaywall(true); return; }
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'failed to load tree' }));
        setError((data as { error?: string }).error ?? 'failed to load tree');
        return;
      }
      setGraph((await res.json()) as RepoGraph);
    }

    loadGraph().catch(() => {});
    const intervalId = setInterval(() => loadGraph().catch(() => {}), 60_000);
    return () => { controller.abort(); clearInterval(intervalId); };
  }, [owner, repo]);

  if (paywall) {
    return (
      <PaywallModal
        reason="needs-subscription"
        scansUsed={0}
        limit={0}
        next={`/${owner}/${repo}`}
        onClose={() => router.push(`/${owner}/${repo}`)}
      />
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#000005' }}>
      <header className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-white/10 shrink-0"
              style={{ background: 'rgba(5,5,10,0.85)' }}>
        <button
          onClick={() => router.back()}
          className="btn-ghost text-sm flex items-center gap-1.5 shrink-0"
          aria-label="Back"
        >
          <BackIcon /> Back
        </button>
        <div className="h-4 w-px bg-white/10 shrink-0" />
        <p className="text-sm font-medium tracking-tight truncate flex-1 min-w-0">
          {owner}/<span className="text-ink-200">{repo}</span>
          <span className="text-xs text-ink-400 font-normal ml-2">3D lens</span>
        </p>
        {graph && (
          <span className="text-xs text-ink-500 shrink-0 hidden sm:inline tabular">
            {graph.nodeCount.toLocaleString()} nodes
            {graph.truncated && <span className="ml-2 text-amber-300">(truncated)</span>}
          </span>
        )}
        <a
          className="btn-ghost text-xs shrink-0"
          href={`https://github.com/${owner}/${repo}`}
          target="_blank"
          rel="noreferrer"
        >
          GitHub ↗
        </a>
      </header>

      <div className="relative flex-1 overflow-hidden">
        {error && <ErrorState message={error} owner={owner} repo={repo} />}
        {!error && !graph && <CanvasSkeleton />}
        {!error && graph && <RepoStructureGraph graph={graph} />}
        {graph && <Legend />}
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function Legend() {
  return (
    <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 card p-3 text-[11px] text-ink-300 space-y-1.5">
      <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-white inline-block" /> folder</div>
      <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#3178c6] inline-block" /> file</div>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: '#ffdd88', boxShadow: '0 0 4px #ffdd88' }} />
        recently changed
      </div>
      <p className="opacity-60 pt-1 border-t border-ink-800">drag to orbit · scroll to zoom · click to fly</p>
    </div>
  );
}

function CanvasSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-ink-400 text-sm flex items-center gap-3">
        <span className="h-3 w-3 rounded-full bg-accent animate-pulse-soft" />
        Building 3D graph…
      </div>
    </div>
  );
}

function ErrorState({ message, owner, repo }: { message: string; owner: string; repo: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-4">
      <div className="card max-w-sm p-5 text-sm">
        <p className="font-medium text-red-400">Couldn't render the 3D lens.</p>
        <p className="mt-1 text-ink-300 word-break">{message}</p>
        <a className="btn-secondary mt-3 w-full text-xs" href={`https://github.com/${owner}/${repo}`} target="_blank" rel="noreferrer">View on GitHub instead</a>
      </div>
    </div>
  );
}
