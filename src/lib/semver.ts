import type { Bump, ClassifiedCommit } from './types';

export const ZERO = '0.0.0';

export function applyBump(version: string, bump: Bump): string {
  const [maj, min, pat] = version.split('.').map(Number);
  switch (bump) {
    case 'major':
      // 0.x is a special case: most ecosystems do NOT promote to 1.0.0 on a breaking
      // change while still pre-1.0 — they bump minor instead. Stay conservative.
      if (maj === 0) return `0.${min + 1}.0`;
      return `${maj + 1}.0.0`;
    case 'minor':
      return `${maj}.${min + 1}.0`;
    case 'patch':
      return `${maj}.${min}.${pat + 1}`;
    case 'none':
    default:
      return version;
  }
}

export interface ComputedTimeline {
  finalVersion: string;
  timeline: { version: string; sha: string; message: string; bump: Bump }[];
}

// commits MUST be in chronological order (oldest first).
export function computeVersion(commits: ClassifiedCommit[]): ComputedTimeline {
  let version = ZERO;
  const timeline: ComputedTimeline['timeline'] = [];
  for (const c of commits) {
    const next = applyBump(version, c.bump);
    if (next !== version) {
      timeline.push({
        version: next,
        sha: c.sha,
        message: c.message.split('\n', 1)[0],
        bump: c.bump,
      });
    }
    version = next;
  }
  return { finalVersion: version, timeline };
}

export function diffBump(from: string, to: string): Bump {
  const [a1, a2, a3] = from.split('.').map(Number);
  const [b1, b2, b3] = to.split('.').map(Number);
  if (b1 !== a1) return 'major';
  if (b2 !== a2) return 'minor';
  if (b3 !== a3) return 'patch';
  return 'none';
}
