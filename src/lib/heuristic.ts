import type { Bump, RawCommit } from './types';

// Conventional Commits + a few common variants.
const BREAKING_BODY = /BREAKING[ -]CHANGE/i;
const HEADER = /^([a-z]+)(\([^)]*\))?(!)?:\s*(.+)$/i;

const MINOR_TYPES = new Set(['feat', 'feature']);
const PATCH_TYPES = new Set([
  'fix', 'bug', 'bugfix', 'perf', 'performance', 'refactor', 'revert',
]);
const NONE_TYPES = new Set([
  'docs', 'doc', 'style', 'test', 'tests', 'chore', 'ci', 'build', 'deps',
]);

export interface HeuristicResult {
  bump: Bump | null;       // null => not confident, send to AI
  matched: boolean;
}

export function classifyHeuristic(commit: RawCommit): HeuristicResult {
  const firstLine = commit.message.split('\n', 1)[0]?.trim() ?? '';
  const body = commit.message.slice(firstLine.length);

  if (BREAKING_BODY.test(commit.message)) return { bump: 'major', matched: true };

  const m = firstLine.match(HEADER);
  if (!m) return { bump: null, matched: false };

  const type = m[1].toLowerCase();
  const bang = m[3] === '!';

  if (bang) return { bump: 'major', matched: true };
  if (MINOR_TYPES.has(type)) return { bump: 'minor', matched: true };
  if (PATCH_TYPES.has(type)) return { bump: 'patch', matched: true };
  if (NONE_TYPES.has(type)) return { bump: 'none', matched: true };

  // Recognised shape but unknown type — let AI decide.
  void body;
  return { bump: null, matched: false };
}
