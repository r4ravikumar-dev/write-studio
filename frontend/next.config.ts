import type {NextConfig} from 'next';

const ID = ':id([0-9a-fA-F-]{36})';

const nextConfig: NextConfig = {
  // The shared package ships TypeScript source (packages/shared).
  transpilePackages: ['@studio/shared'],
  /**
   * Case studies became documents (multi-vertical Phase 2). Old links and bookmarks keep working;
   * each target still checks the session and the owner. The query string is carried over.
   */
  async redirects() {
    return [
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
