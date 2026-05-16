import { NextResponse } from 'next/server';
import { octokit, fetchRepoMeta } from '@/lib/github';
import { buildGraph } from '@/lib/repoTree';
import { loadQuotaContext } from '@/lib/quota';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('repo') ?? '';
  const [owner, repo] = slug.split('/', 2);
  if (!owner || !repo) return NextResponse.json({ error: 'repo must be owner/name' }, { status: 400 });

  // Pro-gated. Quota.subscribed comes from profile.subscription_status.
  const ctx = await loadQuotaContext();
  if (!ctx.subscribed) {
    return NextResponse.json({ error: 'repo-lens-requires-subscription' }, { status: 402 });
  }

  try {
    const meta = await fetchRepoMeta(owner, repo);
    const branch = meta.defaultBranch;
    const gh = octokit();
    // Resolve branch → root tree sha
    const { data: branchData } = await gh.repos.getBranch({ owner, repo, branch });
    const treeSha = branchData.commit.commit.tree.sha;
    const { data } = await gh.git.getTree({ owner, repo, tree_sha: treeSha, recursive: 'true' });
    const tree = data.tree.map((t) => ({ path: t.path ?? '', type: t.type ?? '', size: t.size }));
    const graph = buildGraph(`${owner}/${repo}`, branch, tree, data.truncated ?? false);
    return NextResponse.json(graph, {
      headers: { 'cache-control': 'private, max-age=600, s-maxage=3600' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error';
    const status = /not found|404/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
