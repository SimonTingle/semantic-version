export default function Loading() {
  return (
    <div className="pt-6 sm:pt-10">
      <header className="flex items-start gap-4 flex-wrap">
        <div className="h-12 w-12 rounded-xl bg-ink-800 animate-pulse" />
        <div className="flex-1 min-w-0">
          <div className="h-3 w-24 rounded bg-ink-800 animate-pulse" />
          <div className="mt-2 h-8 w-64 max-w-full rounded bg-ink-800 animate-pulse" />
          <div className="mt-2 h-3 w-3/4 rounded bg-ink-800/70 animate-pulse" />
        </div>
      </header>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-5 sm:p-8 space-y-4">
          <div className="h-3 w-32 rounded bg-ink-800 animate-pulse" />
          <div className="h-16 w-3/4 rounded bg-ink-800 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-ink-800 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="card p-5 sm:p-6 space-y-4">
          <div className="h-4 w-24 rounded bg-ink-800 animate-pulse" />
          <div className="h-10 rounded-xl bg-ink-800 animate-pulse" />
          <div className="h-10 rounded-xl bg-ink-800 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
