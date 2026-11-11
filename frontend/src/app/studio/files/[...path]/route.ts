import {type NextRequest} from 'next/server';
import {STUDIO_PATH} from '@studio/shared';
import {API_URL} from '@/lib/api/env';
import {getAccessToken} from '@/lib/api/session';
import {getCurrentUser} from '@/lib/auth/current-user';

/**
 * A private Studio file, for its owner only: /studio/files/{storage path}.
 * Same origin, so <img> and <video> send the Studio session cookie; the
 * session is checked on every request (and again by the Express API, which
 * looks the file up in the owner's own library). No signed or public links.
 * Unknown, other people's and signed-out requests all get the same 404.
 */
export const dynamic = 'force-dynamic';

const notFound = () =>
  new Response('Not found', {status: 404, headers: {'Cache-Control': 'private, no-store', 'Content-Type': 'text/plain'}});

const PASS = [
  'content-type',
  'content-length',
  'content-range',
  'accept-ranges',
  'etag',
  'last-modified',
  'content-disposition',
  'cache-control',
  'x-content-type-options',
  'content-security-policy',
];

export async function GET(request: NextRequest, {params}: {params: Promise<{path: string[]}>}) {
  const path = (await params).path.join('/');
  if (!STUDIO_PATH.test(path) || !API_URL) return notFound();
  const user = await getCurrentUser();
  if (!user || !path.startsWith(`${user.id}/`)) return notFound();

  const range = request.headers.get('range');
  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/api/app/media?path=${encodeURIComponent(path)}`, {
      headers: {Authorization: `Bearer ${await getAccessToken()}`, ...(range ? {Range: range} : {})},
      cache: 'no-store',
    });
  } catch {
    return new Response('Unavailable', {status: 503, headers: {'Cache-Control': 'private, no-store'}});
  }
  if (!upstream.ok || !upstream.body) return upstream.status === 416 ? new Response(null, {status: 416}) : notFound();

  const headers = new Headers();
  PASS.forEach(name => {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  });
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Vary', 'Cookie');
  return new Response(upstream.body, {status: upstream.status, headers});
}
