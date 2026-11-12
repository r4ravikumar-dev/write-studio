import type {Metadata} from 'next';
import {Analytics} from '@vercel/analytics/next';
import './globals.css';
import {displayFont, primaryFont} from './fonts';
import {SITE_URL} from '@/lib/marketing/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Write Studio — Guided Document Creation Studio',
    template: '%s · Write Studio',
  },
  description:
    'Write Studio helps professionals create clear, structured and visually compelling documents through purpose-built templates, contextual writing guidance and flexible content blocks.',
  keywords: [
    'Write Studio',
    'guided document creation',
    'developer documentation',
    'feature specifications',
    'release notes',
    'product requirements document',
    'technical design document',
    'architecture decision record',
    'standard operating procedure',
    'UX case study',
    'marketing case study',
  ],
  authors: [{name: 'Write Studio'}],
  creator: 'Write Studio',
  publisher: 'Write Studio',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Write Studio',
    title: 'Write Studio — Start with a structure. Finish with clarity.',
    description:
      'Create professional documents with purpose-built templates, guided writing prompts and flexible visual blocks.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Write Studio — Guided Document Creation Studio',
    description:
      'Create professional documents with purpose-built templates, guided writing prompts and flexible visual blocks.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" data-astryx-theme="stone" className={`${primaryFont.variable} ${displayFont.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
