import Link from 'next/link';
import { SearchBar } from '@/components/SearchBar';

export default function Home() {
  return (
    <div className="relative">
      <div aria-hidden className="absolute inset-x-0 top-0 h-[28rem] grid-bg -z-10" />
      <section className="pt-12 sm:pt-20 pb-10 sm:pb-16 text-center">
        <span className="chip bg-accent/15 text-accent-400 border border-accent/30">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-soft" />
          AI-assisted semver, free first scan
        </span>
        <h1 className="mt-5 text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05] word-break">
          What version <em className="not-italic bg-clip-text text-transparent bg-gradient-to-r from-accent-400 to-cyan-300">should</em> your repo be on?
        </h1>
        <p className="mt-4 text-ink-300 text-base sm:text-lg max-w-2xl mx-auto px-2">
          VersionLens walks every commit in any public GitHub repo — heuristic first, AI for the rest —
          and infers the semantic version that history implies. Starting from <code className="px-1.5 py-0.5 rounded bg-ink-800 text-ink-100">0.0.0</code>.
        </p>
        <div className="mt-8 sm:mt-10 max-w-2xl mx-auto px-2">
          <SearchBar />
        </div>
        <div className="mt-6 text-xs text-ink-400 flex flex-wrap justify-center gap-x-4 gap-y-1">
          <span>· 1st scan: free, no sign-in</span>
          <span>· 2nd scan: free with Google</span>
          <span>· 3rd+: €5/month</span>
        </div>
      </section>

      <section className="grid gap-4 sm:gap-6 sm:grid-cols-3 mt-2">
        <Feature title="Heuristic first" body="Conventional Commits (feat/fix/BREAKING) classified instantly with zero AI cost." />
        <Feature title="AI for the rest" body="Anything ambiguous is batched to Claude and cached by commit SHA — re-scans are free." />
        <Feature title="Compare any refs" body="Inferred bump from v1.2.0 → HEAD, with a downloadable CHANGELOG.md." />
      </section>

      <section className="mt-12 card p-5 sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight">How VersionLens decides</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-ink-300">
          <li><strong className="text-ink-100">1.</strong> Fetch full commit history of the chosen ref (up to 1,000 commits).</li>
          <li><strong className="text-ink-100">2.</strong> Parse each commit. <code className="text-ink-100">feat:</code> → minor, <code className="text-ink-100">fix:</code> → patch, <code className="text-ink-100">!:</code>/<code className="text-ink-100">BREAKING CHANGE</code> → major.</li>
          <li><strong className="text-ink-100">3.</strong> Send ambiguous commits to Claude for classification (conservative bias).</li>
          <li><strong className="text-ink-100">4.</strong> Walk chronologically from 0.0.0 — apply each bump in order.</li>
        </ol>
        <p className="mt-4 text-xs text-ink-400">
          Pre-1.0 repos use the conservative “0.x” convention: breaking changes bump the minor, not the major.{' '}
          <Link className="underline hover:text-ink-200" href="/pricing">See pricing</Link>.
        </p>
      </section>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-5">
      <h3 className="font-medium tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm text-ink-300">{body}</p>
    </div>
  );
}
