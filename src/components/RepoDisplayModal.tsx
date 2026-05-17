'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { RepoGraph } from '@/lib/repoTree';
import { PaywallModal } from './PaywallModal';

const RepoStructureGraph = dynamic(() => import('./RepoStructureGraph'), {
  ssr: false,
  loading: () => <CanvasSkeleton />,
});

interface Props {
  owner: string;
  repo: string;
  onClose: () => void;
}

export function RepoDisplayModal({ owner, repo, onClose }: Props) {
  const [graph, setGraph] = useState<RepoGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 640px)').matches);
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (isMobile) return;
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

    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
  }, [owner, repo, isMobile]);

  if (paywall) {
    return <PaywallModal reason="needs-subscription" scansUsed={0} limit={0} next={`/${owner}/${repo}`} onClose={onClose} />;
  }

  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative flex-1 flex flex-col">
        <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-white/10 bg-ink-950/40">
          <div className="min-w-0">
            <p className="text-xs text-ink-400">3D repo lens</p>
            <h2 className="text-base sm:text-lg font-semibold tracking-tight truncate">{owner}/{repo}</h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-ink-400">
            {graph && (
              <span className="hidden sm:inline tabular">
                {graph.nodeCount.toLocaleString()} nodes
                {graph.truncated && <span className="ml-2 text-amber-300">(truncated)</span>}
              </span>
            )}
            <a className="btn-ghost text-xs" href={`https://github.com/${owner}/${repo}`} target="_blank" rel="noreferrer">View on GitHub</a>
            <button className="btn-secondary text-xs" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </header>

        <div className="relative flex-1 overflow-hidden">
          {isMobile ? <MobileFallback owner={owner} repo={repo} /> : null}
          {!isMobile && error && <ErrorState message={error} owner={owner} repo={repo} />}
          {!isMobile && !error && !graph && <CanvasSkeleton />}
          {!isMobile && !error && graph && <RepoStructureGraph graph={graph} />}
          {!isMobile && graph && <Legend />}
        </div>
      </div>
    </div>
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
        <p className="font-medium text-red-400">Couldn’t render the 3D lens.</p>
        <p className="mt-1 text-ink-300 word-break">{message}</p>
        <a className="btn-secondary mt-3 w-full text-xs" href={`https://github.com/${owner}/${repo}`} target="_blank" rel="noreferrer">View on GitHub instead</a>
      </div>
    </div>
  );
}

function MobileFallback({ owner, repo }: { owner: string; repo: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-6">
      <div className="card max-w-sm p-5 text-sm text-center">
        <p className="font-medium">3D lens is desktop-only</p>
        <p className="mt-1 text-ink-300">The interactive graph needs a larger screen. View the repo directly:</p>
        <a className="btn-primary mt-3 w-full text-xs" href={`https://github.com/${owner}/${repo}`} target="_blank" rel="noreferrer">Open {owner}/{repo} on GitHub</a>
      </div>
    </div>
  );
}
