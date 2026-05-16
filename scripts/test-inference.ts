/* eslint-disable no-console */
// Hand-curated regression corpus for the deterministic keyword classifier.
// Run with: npx tsx scripts/test-inference.ts
// Exits non-zero if accuracy drops below 90% so this can gate CI later.

import { classifyByKeywords } from '../src/lib/inference';
import type { Bump } from '../src/lib/types';

interface Case {
  message: string;
  expected: Bump;
  note?: string;
}

// Real and realistic commit messages spanning each rule layer.
const CASES: Case[] = [
  // Breaking phrases
  { message: 'Drop support for Node 14', expected: 'major' },
  { message: 'Remove deprecated /v1 endpoints', expected: 'major' },
  { message: 'BREAKING CHANGE: switch auth to OAuth2', expected: 'major' },
  { message: 'Backwards incompatible cache key format', expected: 'major' },
  { message: 'Rename Foo.bar() to Foo.baz()', expected: 'major' },
  { message: 'Delete legacy AuthV1 controller', expected: 'major' },
  { message: 'Replace Promise.all with allSettled in workflow', expected: 'major', note: 'replace-prefix → major (conservative)' },

  // Feature verbs
  { message: 'Add login page', expected: 'minor' },
  { message: 'Implement OAuth2 PKCE flow', expected: 'minor' },
  { message: 'Introduce dark mode toggle', expected: 'minor' },
  { message: 'Allow custom themes via config', expected: 'minor' },
  { message: 'Enable HTTP/2 by default', expected: 'minor' },
  { message: 'Expose request body to middleware', expected: 'minor' },
  { message: 'Support array values in headers', expected: 'minor' },

  // Patch verbs
  { message: 'Fix race condition in worker pool', expected: 'patch' },
  { message: 'Resolve memory leak in cache invalidator', expected: 'patch' },
  { message: 'Correct timezone offset in invoice generator', expected: 'patch' },
  { message: 'Handle null user agent in scan endpoint', expected: 'patch' },
  { message: 'Prevent NPE when repo is empty', expected: 'patch' },

  // None signals
  { message: 'Update README with badge instructions', expected: 'none' },
  { message: 'Fix typo in error message', expected: 'none' },
  { message: 'Add tests for compareCommits path', expected: 'none' },
  { message: 'Format with prettier', expected: 'none' },
  { message: 'Bump dependencies in lockfile', expected: 'patch', note: 'dep bumps can change behaviour → conservative patch' },
  { message: 'docs: clarify quota rules', expected: 'none' },
  { message: 'CI: switch to ubuntu-22.04', expected: 'none' },

  // Soft patch verbs (medium confidence)
  { message: 'Refactor scan orchestrator for testability', expected: 'patch' },
  { message: 'Improve graph layout performance', expected: 'patch' },
  { message: 'Simplify quota context loader', expected: 'patch' },
  { message: 'Upgrade Octokit to v21', expected: 'patch' },

  // Default fallback
  { message: 'Misc changes', expected: 'patch', note: 'no signal → default patch' },
  { message: 'Wip', expected: 'patch' },
];

interface Row {
  message: string;
  expected: Bump;
  actual: Bump;
  rule: string;
  pass: boolean;
}

const rows: Row[] = CASES.map((c) => {
  const r = classifyByKeywords({ sha: 'x', message: c.message, authoredAt: '', url: '' });
  return { message: c.message, expected: c.expected, actual: r.bump, rule: r.rule, pass: r.bump === c.expected };
});

const passed = rows.filter((r) => r.pass).length;
const total = rows.length;
const pct = (passed / total) * 100;

console.log('Inference engine accuracy check\n');
for (const r of rows) {
  const tag = r.pass ? 'PASS' : 'FAIL';
  console.log(`[${tag}] expected=${r.expected.padEnd(5)} got=${r.actual.padEnd(5)} rule=${r.rule.padEnd(30)} | ${r.message}`);
}
console.log(`\n${passed}/${total} cases pass (${pct.toFixed(1)}%)`);

const threshold = 90;
if (pct < threshold) {
  console.error(`Accuracy ${pct.toFixed(1)}% is below ${threshold}% threshold.`);
  process.exit(1);
}
