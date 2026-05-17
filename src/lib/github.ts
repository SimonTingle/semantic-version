import { Octokit } from '@octokit/rest';
import type { RawCommit } from './types';
import type { FileHeat } from './repoTree';

const SERVER_TOKEN = process.env.GITHUB_TOKEN || undefined;

export function octokit(userToken?: string) {
  return new Octokit({ auth: userToken || SERVER_TOKEN, userAgent: 'versionlens/0.1' });
}

export interface RepoMeta {
  fullName: string;
  description: string | null;
  stars: number;
  defaultBranch: string;
  isPrivate: boolean;
  ownerAvatar: string | null;
  htmlUrl: string;
}

export async function fetchUserRepos(username: string, token?: string) {
  const gh = octokit(token);
  // listForUser is paginated; cap at 100 for v1.
  const { data } = await gh.repos.listForUser({
    username, per_page: 100, sort: 'updated', type: 'owner',
  });
  return data.map((r) => ({
    name: r.name,
    fullName: r.full_name,
    description: r.description,
    stars: r.stargazers_count ?? 0,
    defaultBranch: r.default_branch ?? 'main',
    isPrivate: r.private,
    htmlUrl: r.html_url,
  }));
}

export async function fetchRepoMeta(owner: string, repo: string, token?: string): Promise<RepoMeta> {
  const gh = octokit(token);
  const { data } = await gh.repos.get({ owner, repo });
  return {
    fullName: data.full_name,
    description: data.description,
    stars: data.stargazers_count ?? 0,
    defaultBranch: data.default_branch ?? 'main',
    isPrivate: data.private,
    ownerAvatar: data.owner?.avatar_url ?? null,
    htmlUrl: data.html_url,
  };
}

export interface FetchCommitsOptions {
  owner: string;
  repo: string;
  base?: string;      // optional starting ref (exclusive) for "compare" mode
  head?: string;      // optional ending ref (inclusive); defaults to default branch
  maxCommits?: number;
  token?: string;
}

export async function fetchCommits(opts: FetchCommitsOptions): Promise<{ commits: RawCommit[]; truncated: boolean }> {
  const gh = octokit(opts.token);
  const max = opts.maxCommits ?? 1000;

  // Compare-mode: use the compare endpoint (returns commits in chronological order)
  if (opts.base && opts.head) {
    const { data } = await gh.repos.compareCommits({
      owner: opts.owner, repo: opts.repo, base: opts.base, head: opts.head,
    });
    const commits = data.commits.slice(0, max).map(toRaw);
    return { commits, truncated: data.commits.length > max };
  }

  // Full history: paginate commits, then reverse to chronological order.
  const out: RawCommit[] = [];
  let page = 1;
  let truncated = false;
  while (out.length < max) {
    const { data } = await gh.repos.listCommits({
      owner: opts.owner,
      repo: opts.repo,
      sha: opts.head,
      per_page: 100,
      page,
    });
    if (data.length === 0) break;
    for (const c of data) {
      out.push(toRaw(c));
      if (out.length >= max) { truncated = data.length === 100; break; }
    }
    if (data.length < 100) break;
    page += 1;
  }
  out.reverse();
  return { commits: out, truncated };
}

type GhCommit = {
  sha: string;
  html_url: string;
  commit: { message: string; author: { date?: string | null } | null };
};

const HEAT_VALUES = [1, 0.75, 0.5, 0.3, 0.15] as const;

export async function fetchRecentFileActivity(
  owner: string,
  repo: string,
  count = 5,
): Promise<FileHeat[]> {
  try {
    const gh = octokit();
    const { data: commits } = await gh.repos.listCommits({ owner, repo, per_page: count });
    const details = await Promise.all(
      commits.map((c) =>
        gh.repos.getCommit({ owner, repo, ref: c.sha }).catch(() => null),
      ),
    );
    const heatMap = new Map<string, number>();
    for (let i = 0; i < details.length; i++) {
      const detail = details[i];
      if (!detail) continue;
      const heat = HEAT_VALUES[i] ?? HEAT_VALUES[4];
      for (const file of detail.data.files ?? []) {
        const existing = heatMap.get(file.filename);
        if (existing === undefined || heat > existing) heatMap.set(file.filename, heat);
      }
    }
    return Array.from(heatMap.entries()).map(([path, heat]) => ({ path, heat }));
  } catch {
    return [];
  }
}

function toRaw(c: GhCommit): RawCommit {
  return {
    sha: c.sha,
    message: c.commit.message,
    authoredAt: c.commit.author?.date ?? '',
    url: c.html_url,
  };
}
