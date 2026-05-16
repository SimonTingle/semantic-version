import { NextResponse } from 'next/server';
import { runScan } from '@/lib/scan';
import { loadQuotaContext, decide, recordScan } from '@/lib/quota';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { owner?: string; repo?: string; base?: string; head?: string; maxCommits?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const owner = (body.owner || '').trim();
  const repo = (body.repo || '').trim();
  if (!owner || !repo) return NextResponse.json({ error: 'owner and repo are required' }, { status: 400 });

  const ctx = await loadQuotaContext();
  const decision = decide(ctx);
  if (!decision.allowed) {
    return NextResponse.json(
      { error: 'quota', decision },
      { status: 402 },
    );
  }

  try {
    const result = await runScan({
      owner,
      repo,
      base: body.base,
      head: body.head,
      maxCommits: body.maxCommits,
    });
    await recordScan({
      ctx,
      owner,
      repo,
      inferredVersion: result.inferredVersion,
      commitsAnalyzed: result.commitsAnalyzed,
      aiCalls: result.aiCalls,
    });
    return NextResponse.json({ result, decision });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error';
    const status = /not found|404/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
