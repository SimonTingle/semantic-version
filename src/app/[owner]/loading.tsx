export default function Loading() {
  return (
    <div className="pt-8 sm:pt-12">
      <div className="h-14 rounded-xl bg-ink-900/60 border border-ink-800 animate-pulse" />
      <div className="mt-6 flex items-baseline gap-4">
        <div className="h-8 w-48 rounded bg-ink-800 animate-pulse" />
        <div className="h-4 w-20 rounded bg-ink-800 animate-pulse ml-auto" />
      </div>
      <ul className="mt-6 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <li key={i} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="h-4 w-32 rounded bg-ink-800 animate-pulse" />
              <div className="h-5 w-12 rounded-full bg-ink-800 animate-pulse" />
            </div>
            <div className="mt-3 h-3 w-full rounded bg-ink-800/70 animate-pulse" />
            <div className="mt-2 h-3 w-4/5 rounded bg-ink-800/70 animate-pulse" />
            <div className="mt-4 h-5 w-16 rounded-full bg-ink-800 animate-pulse" />
          </li>
        ))}
      </ul>
    </div>
  );
}
