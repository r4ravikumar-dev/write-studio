import type {NextConfig} from 'next';

const ID = ':id([0-9a-fA-F-]{36})';

/**
 * One address in production. Vercel also serves the site on other *.vercel.app names; the
 * Turnstile widget only accepts its registered hostname (error 110200 elsewhere) and sign-in
 * cookies belong to one host, so every other host redirects to SITE_URL. Off in development
 * and previews (VERCEL_ENV isn't "production") and when SITE_URL isn't set.
 */
const SITE_URL = (process.env.SITE_URL ?? '').trim().replace(/\/+$/, '');
const SITE_HOST = SITE_URL ? new URL(SITE_URL).host : '';
const oneAddress =
  SITE_HOST && process.env.VERCEL_ENV === 'production'
    ? [
        {
          source: '/:path*',
          missing: [{type: 'host' as const, value: SITE_HOST.replace(/\./g, '\\.')}],
          destination: `${SITE_URL}/:path*`,
          permanent: false,
        },
      ]
    : [];

const nextConfig: NextConfig = {
  // The shared package ships TypeScript source (packages/shared).
  transpilePackages: ['@studio/shared'],
  /**
   * Case studies became documents (multi-vertical Phase 2). Old links and bookmarks keep working;
   * each target still checks the session and the owner. The query string is carried over.
   */
  async redirects() {
    return [
      ...oneAddress,
      {source: `/studio/case-studies/${ID}/preview`, destination: '/studio/documents/:id/preview', permanent: true},
      {source: `/studio/case-studies/${ID}/setup`, destination: '/studio/documents/:id/setup', permanent: true},
      {source: `/studio/case-studies/${ID}`, destination: '/studio/documents/:id/edit', permanent: true},
      {source: '/studio/case-studies/new', destination: '/studio/documents/new', permanent: true},
      {source: '/studio/case-studies', destination: '/studio/documents', permanent: true},
      {source: `/studio/documents/${ID}`, destination: '/studio/documents/:id/edit', permanent: true},
      {source: '/studio/dashboard', destination: '/studio', permanent: true},
    ];
  },
};

export default nextConfig;
