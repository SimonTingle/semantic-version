import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: ‘VersionLens — Infer any repo’s semantic version from its commits’,
  description:
    ‘Search a GitHub user, pick a repo, and VersionLens walks every commit (heuristic + AI) to tell you the semantic version that history implies.’,
  openGraph: {
    title: ‘VersionLens’,
    description: ‘Infer semver from commit history with AI.’,
    type: ‘website’,
    url: ‘https://versionlens.simontingle.com’,
    images: [
      {
        url: ‘https://versionlens.simontingle.com/og-image.png’,
        width: 1200,
        height: 630,
        alt: ‘VersionLens — 3D repo lens with semantic version inference’,
      },
    ],
  },
  twitter: {
    card: ‘summary_large_image’,
    title: ‘VersionLens’,
    description: ‘Infer semver from commit history with AI.’,
    images: [‘https://versionlens.simontingle.com/og-image.png’],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a0d1f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-20">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
