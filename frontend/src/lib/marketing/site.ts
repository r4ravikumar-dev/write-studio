/**
 * The public address used for canonical links, the sitemap and robots.txt. Production sets
 * SITE_URL (see frontend/.env.example); without it (local builds) links point at the dev server.
 */
export const SITE_URL = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
