import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// Lightweight SVG version badge. Returns "version | x.y.z" with VersionLens colours.
// Cached at the edge for 10 minutes via Cache-Control headers.
export async function GET(_req: Request, { params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = await params;
  const admin = supabaseAdmin();
  let version = '0.0.0';
  if (admin) {
    const { data } = await admin
      .from('scans')
      .select('inferred_version')
      .eq('owner', owner)
      .eq('repo', repo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.inferred_version) version = data.inferred_version;
  }

  const label = 'version';
  const labelW = 56;
  const valueW = 12 + version.length * 7;
  const totalW = labelW + valueW;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20" role="img" aria-label="${label}: ${version}">
  <linearGradient id="b" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <mask id="a"><rect width="${totalW}" height="20" rx="3" fill="#fff"/></mask>
  <g mask="url(#a)">
    <rect width="${labelW}" height="20" fill="#555"/>
    <rect x="${labelW}" width="${valueW}" height="20" fill="#7c5cff"/>
    <rect width="${totalW}" height="20" fill="url(#b)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelW / 2}" y="14">${label}</text>
    <text x="${labelW + valueW / 2}" y="14">${version}</text>
  </g>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=600, s-maxage=600',
    },
  });
}
