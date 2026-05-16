export function Footer() {
  return (
    <footer className="border-t border-ink-800/60 mt-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-xs text-ink-400 flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} VersionLens. Inferred versions are best-effort and never replace your release process.</p>
        <p className="opacity-70">Heuristic first, AI fallback. Public repos only in v1.</p>
      </div>
    </footer>
  );
}
