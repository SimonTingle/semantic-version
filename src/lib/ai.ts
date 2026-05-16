import Anthropic from '@anthropic-ai/sdk';
import type { Bump, RawCommit } from './types';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You classify git commit messages by their semantic-version impact.
For each commit you output exactly one of: major | minor | patch | none.

Rules:
- major  = a breaking change to a public/user-facing interface, removed feature, incompatible behaviour change.
- minor  = a new user-facing feature or capability, backwards-compatible.
- patch  = a bug fix, performance fix, refactor, dependency bump that does not change behaviour.
- none   = pure docs, tests, formatting, CI, chore, internal tooling with no user-visible effect.

Be conservative: when uncertain between minor/patch, pick patch. When uncertain between patch/none, pick none.
Output ONLY a JSON array of objects like: [{"sha":"abc","bump":"patch"}, ...] in the same order as the input.`;

const BATCH_SIZE = 25;

export async function classifyWithAI(commits: RawCommit[]): Promise<Map<string, Bump>> {
  const result = new Map<string, Bump>();
  if (commits.length === 0 || !process.env.ANTHROPIC_API_KEY) return result;

  for (let i = 0; i < commits.length; i += BATCH_SIZE) {
    const batch = commits.slice(i, i + BATCH_SIZE);
    const userMessage = batch
      .map((c) => `SHA: ${c.sha.slice(0, 7)}\n${truncate(c.message, 600)}`)
      .join('\n---\n');

    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const parsed = safeParseArray(text);
    for (const entry of parsed) {
      const short = String(entry.sha ?? '').slice(0, 7);
      const match = batch.find((c) => c.sha.startsWith(short));
      if (match && isBump(entry.bump)) result.set(match.sha, entry.bump);
    }
    for (const c of batch) {
      if (!result.has(c.sha)) result.set(c.sha, 'patch'); // conservative fallback
    }
  }
  return result;
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function isBump(x: unknown): x is Bump {
  return x === 'major' || x === 'minor' || x === 'patch' || x === 'none';
}

function safeParseArray(text: string): Array<{ sha?: string; bump?: string }> {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) return [];
  try {
    const v = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
