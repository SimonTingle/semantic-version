import type { Bump, RawCommit } from './types';

// Deterministic keyword-based classifier. Runs after the strict Conventional
// Commits heuristic but before any LLM. Inputs are matched against the subject
// (lowercased, trimmed) plus the body for breaking-change phrases.

export interface InferenceResult {
  bump: Bump;
  confidence: 'high' | 'medium' | 'low';
  rule: string;
}

// --- Layer 1: breaking-change phrases (anywhere in message) -------------------
// These are matched as substrings; word-boundary regex would miss phrasings
// like "drops support" or "removed-feature".
const BREAKING_PHRASES = [
  'breaking change',
  'breaking-change',
  'drop support',
  'drops support',
  'dropped support',
  'remove support',
  'remove deprecated',
  'no longer supports',
  'incompatible',
  'backwards incompatible',
  'backward incompatible',
];

// --- Layer 1b: breaking single-word verbs at subject start --------------------
// Word-boundary matched to avoid "deprecation-warning" → minor false positives.
const BREAKING_SUBJECT_VERBS = [
  'remove', 'removed', 'removes',
  'delete', 'deleted', 'deletes',
  'deprecate', 'deprecated', 'deprecates',
  'rename', 'renamed', 'renames',
  'replace', 'replaced', 'replaces',
  'rewrite', 'rewrote',
  'migrate', 'migrated',
];

// --- Layer 2: feature verbs (subject-starting) --------------------------------
const FEATURE_VERBS = [
  'add', 'adds', 'added', 'adding',
  'implement', 'implements', 'implemented', 'implementing',
  'introduce', 'introduces', 'introduced', 'introducing',
  'create', 'creates', 'created',
  'allow', 'allows', 'allowed',
  'enable', 'enables', 'enabled',
  'expose', 'exposes', 'exposed',
  'support', 'supports', 'supported',
];

// --- Layer 3: patch verbs (subject-starting) ----------------------------------
const PATCH_VERBS = [
  'fix', 'fixes', 'fixed', 'fixing',
  'resolve', 'resolves', 'resolved',
  'correct', 'corrects', 'corrected',
  'patch', 'patches', 'patched',
  'handle', 'handles', 'handled',
  'address', 'addresses', 'addressed',
  'prevent', 'prevents', 'prevented',
  'avoid', 'avoids',
  'guard',
];

// --- Layer 4: "none" signals --------------------------------------------------
// Order matters: prefer specific phrases over single words.
const NONE_PHRASES = [
  'update readme', 'update docs', 'update documentation',
  'fix typo', 'fix typos', 'typo fix',
  'add test', 'add tests', 'more tests',
  'update test', 'update tests',
  'lint fix', 'format code', 'code style',
  'whitespace', 'trailing whitespace',
  'rename file', 'rename files',
  'bump version', 'version bump',
  'release ', 'release-',
  'ci:', 'ci ', 'github actions', 'workflow:',
  'gitignore', 'editorconfig',
];

const NONE_KEYWORDS = [
  'readme', 'docs', 'documentation', 'doc',
  'typo', 'typos',
  'lint', 'linting', 'eslint', 'prettier',
  'format', 'formatting', 'comment', 'comments',
  'changelog',
];

// --- Layer 5: soft patch verbs (medium confidence) ----------------------------
const SOFT_PATCH_VERBS = [
  'update', 'updates', 'updated',
  'improve', 'improves', 'improved', 'improving',
  'optimize', 'optimizes', 'optimized',
  'refactor', 'refactors', 'refactored', 'refactoring',
  'simplify', 'simplified',
  'cleanup', 'clean-up',
  'tweak', 'tweaks', 'tweaked',
  'bump', 'bumps', 'bumped',
  'upgrade', 'upgrades', 'upgraded',
];

// --- Layer 6: soft feature signals (medium confidence) ------------------------
const SOFT_FEATURE_KEYWORDS = ['feature', 'feat', 'new'];

export function classifyByKeywords(commit: RawCommit): InferenceResult {
  const message = commit.message;
  const subject = (message.split('\n', 1)[0] ?? '').toLowerCase().trim();
  const lowerMessage = message.toLowerCase();

  // Layer 1a: breaking phrases anywhere in the message.
  for (const phrase of BREAKING_PHRASES) {
    if (lowerMessage.includes(phrase)) {
      return { bump: 'major', confidence: 'high', rule: `breaking-phrase:${phrase}` };
    }
  }

  // Layer 1b: breaking verbs starting the subject.
  for (const verb of BREAKING_SUBJECT_VERBS) {
    if (startsWithWord(subject, verb)) {
      return { bump: 'major', confidence: 'high', rule: `breaking-verb:${verb}` };
    }
  }

  // Layer 4 (before features): "none" phrases — catches "fix typo" before "fix" hits patch.
  for (const phrase of NONE_PHRASES) {
    if (subject.includes(phrase)) {
      return { bump: 'none', confidence: 'high', rule: `none-phrase:${phrase.trim()}` };
    }
  }
  for (const kw of NONE_KEYWORDS) {
    if (containsWord(subject, kw)) {
      return { bump: 'none', confidence: 'high', rule: `none-keyword:${kw}` };
    }
  }

  // Layer 2: feature verbs at subject start.
  for (const verb of FEATURE_VERBS) {
    if (startsWithWord(subject, verb)) {
      return { bump: 'minor', confidence: 'high', rule: `feature-verb:${verb}` };
    }
  }

  // Layer 3: patch verbs at subject start.
  for (const verb of PATCH_VERBS) {
    if (startsWithWord(subject, verb)) {
      return { bump: 'patch', confidence: 'high', rule: `patch-verb:${verb}` };
    }
  }

  // Layer 5: soft patch verbs (medium confidence).
  for (const verb of SOFT_PATCH_VERBS) {
    if (startsWithWord(subject, verb)) {
      return { bump: 'patch', confidence: 'medium', rule: `soft-patch:${verb}` };
    }
  }

  // Layer 6: soft feature keywords anywhere in subject.
  for (const kw of SOFT_FEATURE_KEYWORDS) {
    if (containsWord(subject, kw)) {
      return { bump: 'minor', confidence: 'medium', rule: `soft-feature:${kw}` };
    }
  }

  // Layer 7: nothing matched. Safe default.
  return { bump: 'patch', confidence: 'low', rule: 'default' };
}

function startsWithWord(haystack: string, word: string): boolean {
  if (!haystack.startsWith(word)) return false;
  const next = haystack.charAt(word.length);
  return next === '' || !/[a-z0-9]/i.test(next);
}

function containsWord(haystack: string, word: string): boolean {
  const re = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
  return re.test(haystack);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
