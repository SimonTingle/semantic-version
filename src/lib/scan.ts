import { fetchCommits } from './github';
import { classifyHeuristic } from './heuristic';
import { classifyByKeywords } from './inference';
import { classifyWithAI } from './ai';
import { computeVersion } from './semver';
import type { Bump, ClassifiedCommit, RawCommit, ScanResult } from './types';
import { supabaseAdmin } from './supabase/admin';

export interface RunScanArgs {
  owner: string;
  repo: string;
  base?: string;
  head?: string;
  maxCommits?: number;
  githubToken?: string;
}

export async function runScan(args: RunScanArgs): Promise<ScanResult> {
  const fullName = `${args.owner}/${args.repo}`;
  const { commits, truncated } = await fetchCommits({
    owner: args.owner,
    repo: args.repo,
    base: args.base,
    head: args.head,
    maxCommits: args.maxCommits,
    token: args.githubToken,
  });

  const cached = await loadCache(fullName, commits.map((c) => c.sha));
  const aiCandidates: RawCommit[] = [];
  const aiEnabled = Boolean(process.env.ANTHROPIC_API_KEY);

  const partial: ClassifiedCommit[] = commits.map((c) => {
    const cachedBump = cached.get(c.sha);
    if (cachedBump) return { ...c, bump: cachedBump.bump, source: 'cache' };

    const h = classifyHeuristic(c);
    if (h.matched && h.bump) return { ...c, bump: h.bump, source: 'heuristic' };

    const inf = classifyByKeywords(c);
    // If the LLM is available, escalate only the low-confidence commits.
    if (aiEnabled && inf.confidence === 'low') aiCandidates.push(c);
    return { ...c, bump: inf.bump, source: 'inference', rationale: inf.rule };
  });

  let aiCalls = 0;
  if (aiCandidates.length > 0) {
    const aiMap = await classifyWithAI(aiCandidates);
    aiCalls = aiCandidates.length;
    for (const c of partial) {
      const aiBump = aiMap.get(c.sha);
      if (aiBump) { c.bump = aiBump; c.source = 'ai'; c.rationale = 'llm-fallback'; }
    }
  }

  // Persist new classifications (heuristic + inference + ai). Ignore cache hits.
  await saveCache(
    fullName,
    partial
      .filter((c) => c.source !== 'cache')
      .map((c) => ({ sha: c.sha, bump: c.bump, source: c.source as 'heuristic' | 'inference' | 'ai', message: c.message })),
  );

  const { finalVersion, timeline } = computeVersion(partial);
  return {
    owner: args.owner,
    repo: args.repo,
    inferredVersion: finalVersion,
    commitsAnalyzed: partial.length,
    aiCalls,
    classifications: partial,
    timeline,
    truncated,
  };
}

interface CachedEntry { bump: Bump }

async function loadCache(fullName: string, shas: string[]): Promise<Map<string, CachedEntry>> {
  const out = new Map<string, CachedEntry>();
  if (shas.length === 0) return out;
  const db = supabaseAdmin();
  if (!db) return out;
  const { data, error } = await db
    .from('commit_classifications')
    .select('sha,bump')
    .eq('repo_full_name', fullName)
    .in('sha', shas);
  if (error || !data) return out;
  for (const row of data) out.set(row.sha, { bump: row.bump as Bump });
  return out;
}

async function saveCache(
  fullName: string,
  rows: { sha: string; bump: Bump; source: 'heuristic' | 'inference' | 'ai'; message: string }[],
) {
  if (rows.length === 0) return;
  const db = supabaseAdmin();
  if (!db) return;
  const payload = rows.map((r) => ({
    repo_full_name: fullName,
    sha: r.sha,
    bump: r.bump,
    source: r.source,
    message_excerpt: r.message.split('\n', 1)[0].slice(0, 200),
  }));
  await db.from('commit_classifications').upsert(payload, { onConflict: 'repo_full_name,sha' });
}
