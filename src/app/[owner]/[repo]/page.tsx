import { fetchRepoMeta } from '@/lib/github';
import { loadQuotaContext } from '@/lib/quota';
import { ScanView } from '@/components/ScanView';

interface Props { params: Promise<{ owner: string; repo: string }> }

export default async function RepoPage({ params }: Props) {
  const { owner: rawOwner, repo: rawRepo } = await params;
  const owner = decodeURIComponent(rawOwner);
  const repo = decodeURIComponent(rawRepo);
  let meta: Awaited<ReturnType<typeof fetchRepoMeta>> | null = null;
  let error: string | null = null;
  try {
    meta = await fetchRepoMeta(owner, repo);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load';
  }

  if (error || !meta) {
    return (
      <div className="pt-12 card p-6">
        <h1 className="text-xl font-semibold tracking-tight">Could not load {owner}/{repo}</h1>
        <p className="text-sm text-ink-300 mt-2 word-break">{error}</p>
      </div>
    );
  }

  const ctx = await loadQuotaContext();
  const isPro = ctx.subscribed || ctx.isAdmin;

  return (
    <ScanView
      owner={owner}
      repo={repo}
      defaultBranch={meta.defaultBranch}
      description={meta.description}
      avatarUrl={meta.ownerAvatar}
      stars={meta.stars}
      isPro={isPro}
    />
  );
}
