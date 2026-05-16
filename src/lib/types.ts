export type Bump = 'major' | 'minor' | 'patch' | 'none';

export interface RawCommit {
  sha: string;
  message: string;
  authoredAt: string;
  url: string;
}

export interface ClassifiedCommit extends RawCommit {
  bump: Bump;
  source: 'heuristic' | 'ai' | 'cache';
  rationale?: string;
}

export interface ScanResult {
  owner: string;
  repo: string;
  inferredVersion: string;
  commitsAnalyzed: number;
  aiCalls: number;
  classifications: ClassifiedCommit[];
  timeline: { version: string; sha: string; message: string; bump: Bump }[];
  truncated: boolean;
}
