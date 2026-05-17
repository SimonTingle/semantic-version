import { loadQuotaContext } from '@/lib/quota';
import { redirect } from 'next/navigation';
import { LensView } from '@/components/LensView';

interface Props { params: Promise<{ owner: string; repo: string }> }

export default async function LensPage({ params }: Props) {
  const { owner: rawOwner, repo: rawRepo } = await params;
  const owner = decodeURIComponent(rawOwner);
  const repo = decodeURIComponent(rawRepo);
  const ctx = await loadQuotaContext();
  if (!ctx.subscribed && !ctx.isAdmin) {
    redirect(`/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  }
  return <LensView owner={owner} repo={repo} />;
}
