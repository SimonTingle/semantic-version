'use client';
import { useState } from 'react';
import { RepoDisplayModal } from './RepoDisplayModal';

export function RepoLensButton({ owner, repo }: { owner: string; repo: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div>
        <h3 className="font-medium tracking-tight flex items-center gap-2">
          3D repo lens
          <span className="chip bg-accent/15 text-accent-400 border border-accent/30 text-[10px]">Pro</span>
        </h3>
        <p className="text-xs text-ink-400 mt-1">
          Open this repository as an interactive 3D graph — folders as suns, files as planets.
        </p>
        <button onClick={() => setOpen(true)} className="btn-secondary mt-3 w-full text-sm inline-flex items-center justify-center gap-2">
          <LensIcon /> Open 3D lens
        </button>
      </div>
      {open && <RepoDisplayModal owner={owner} repo={repo} onClose={() => setOpen(false)} />}
    </>
  );
}

function LensIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h3M18 12h3M12 3v3M12 18v3" />
    </svg>
  );
}
