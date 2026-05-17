import { NextResponse } from 'next/server';
import { octokit, fetchRepoMeta, fetchRecentFileActivity } from '@/lib/github';
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

  // Pro-gated. Allow subscribed users or admins.
  const ctx = await loadQuotaContext();
  if (!ctx.subscribed && !ctx.isAdmin) {
    return NextResponse.json({ error: 'repo-lens-requires-subscription' }, { status: 402 });
  }

  try {
    const meta = await fetchRepoMeta(owner, repo);
    const branch = meta.defaultBranch;
    const gh = octokit();
    // Resolve branch → root tree sha
    const { data: branchData } = await gh.repos.getBranch({ owner, repo, branch });
    const treeSha = branchData.commit.commit.tree.sha;
    const [treeRes, fileActivity] = await Promise.all([
      gh.git.getTree({ owner, repo, tree_sha: treeSha, recursive: 'true' }),
      fetchRecentFileActivity(owner, repo),
    ]);
    const tree = treeRes.data.tree.map((t) => ({ path: t.path ?? '', type: t.type ?? '', size: t.size }));
    const graph = buildGraph(`${owner}/${repo}`, branch, tree, treeRes.data.truncated ?? false, fileActivity);
    return NextResponse.json(graph, {
      headers: { 'cache-control': 'private, max-age=60, s-maxage=60' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error';
    const status = /not found|404/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
