'use client';
import Link from 'next/link';

export function RepoLensButton({ owner, repo, isPro }: { owner: string; repo: string; isPro?: boolean }) {
  return (
    <div>
      <h3 className="font-medium tracking-tight flex items-center gap-2">
        3D repo lens
        {!isPro && <span className="chip bg-accent/15 text-accent-400 border border-accent/30 text-[10px]">Pro</span>}
      </h3>
      <p className="text-xs text-ink-400 mt-1">
        Open this repository as an interactive 3D graph — folders as suns, files as planets.
      </p>
      <Link
        href={`/${owner}/${repo}/lens`}
        className="btn-secondary mt-3 w-full text-sm inline-flex items-center justify-center gap-2"
      >
        <LensIcon /> Open 3D lens
      </Link>
    </div>
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
