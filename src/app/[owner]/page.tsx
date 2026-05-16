import Link from 'next/link';
import { fetchUserRepos } from '@/lib/github';
import { SearchBar } from '@/components/SearchBar';

interface Props { params: Promise<{ owner: string }> }

export default async function OwnerPage({ params }: Props) {
  const { owner: rawOwner } = await params;
  const owner = decodeURIComponent(rawOwner);
  let repos: Awaited<ReturnType<typeof fetchUserRepos>> = [];
  let error: string | null = null;
  try {
    repos = await fetchUserRepos(owner);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load';
  }

  return (
    <div className="pt-8 sm:pt-12">
      <div className="mb-6">
        <SearchBar />
      </div>
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight word-break">
          <span className="text-ink-400">repos by</span> {owner}
        </h1>
        {!error && <p className="text-sm text-ink-400 tabular">{repos.length} repositories</p>}
      </header>

      {error && (
        <div className="card mt-6 p-5 text-sm">
          <p className="font-medium text-red-400">Couldn’t load repos.</p>
          <p className="text-ink-300 mt-1 word-break">{error}</p>
          <p className="text-ink-400 mt-2 text-xs">Anonymous GitHub requests are limited to 60/hour per IP. If this hits often, set <code>GITHUB_TOKEN</code>.</p>
        </div>
      )}

      <ul className="mt-6 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {repos.map((r) => (
          <li key={r.fullName}>
            <Link href={`/${encodeURIComponent(owner)}/${encodeURIComponent(r.name)}`} className="card block p-4 hover:border-accent/50 transition group">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium tracking-tight word-break group-hover:text-accent-400 transition">{r.name}</h3>
                <span className="chip bg-ink-800 text-ink-300 tabular shrink-0">★ {r.stars}</span>
              </div>
              <p className="mt-1.5 text-sm text-ink-300 line-clamp-2 min-h-[2.5rem] word-break">{r.description || '—'}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-ink-400">
                <span className="chip bg-ink-800 border border-ink-700">{r.defaultBranch}</span>
                {r.isPrivate && <span className="chip bg-amber-500/15 text-amber-300">private</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
