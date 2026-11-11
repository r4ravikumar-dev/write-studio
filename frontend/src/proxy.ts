import {NextResponse, type NextRequest} from 'next/server';
import {STUDIO_SESSION, clearedCookieOptions, sessionCookies} from '@/lib/api/cookies';
import {refreshTokens} from '@/lib/api/django';
import {isBackendConfigured} from '@/lib/api/env';
import {verifyAccessToken, type SessionUser} from '@/lib/api/jwt';
import {safeStudioNext} from '@/lib/auth/safe-next';

/**
 * Guards the Studio. One rule for everyone: any verified account may use
 * /studio (only its own workspace, enforced by the API and the database);
 * sign-in, sign-up and recovery pages are open. There is no owner or admin.
 *
 * An expired access token is refreshed with Django before the page or server
 * action runs. This is navigation, not the security boundary: every server
 * action and the Express API check the token again.
 */
const PUBLIC_PAGES = /^\/studio\/(login|signup|forgot-password|update-password|confirm)(\/|$)/;
const ENTRY_PAGES = /^\/studio\/(login|signup)(\/|$)/;
/** Private files: never redirect (that would reveal that a path exists); just 404. */
const FILES = /^\/studio\/files\//;

async function session(request: NextRequest) {
  let user: SessionUser | null = await verifyAccessToken(request.cookies.get(STUDIO_SESSION.access)?.value);
  let refreshed: ReturnType<typeof sessionCookies> | null = null;
  let signedOut = false;
  const refresh = request.cookies.get(STUDIO_SESSION.refresh)?.value;
  if (!user && refresh) {
    const result = await refreshTokens(refresh);
    if (result.ok) {
      refreshed = sessionCookies(result.data);
      user = await verifyAccessToken(result.data.access);
      // Let the page and server actions in this same request see the new token.
      refreshed.forEach(({name, value}) => request.cookies.set(name, value));
    } else if (result.status === 401) {
      signedOut = true;
    }
  }
  return {user, refreshed, signedOut};
}

function finish(response: NextResponse, s: Awaited<ReturnType<typeof session>>) {
  s.refreshed?.forEach(({name, value, options}) => response.cookies.set(name, value, options));
  if (s.signedOut) {
    response.cookies.set(STUDIO_SESSION.access, '', clearedCookieOptions);
    response.cookies.set(STUDIO_SESSION.refresh, '', clearedCookieOptions);
  }
  // Signed-in pages are per person: never cache them anywhere.
  if (s.user) response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function redirectTo(request: NextRequest, pathname: string, search = '') {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = search;
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  if (!isBackendConfigured) return NextResponse.next();
  const {pathname, search} = request.nextUrl;
  const s = await session(request);
  if (!s.user && FILES.test(pathname)) {
    return finish(new NextResponse('Not found', {status: 404, headers: {'Cache-Control': 'private, no-store'}}), s);
  }
  if (!s.user && !PUBLIC_PAGES.test(pathname)) {
    const next = safeStudioNext(pathname + search);
    return finish(redirectTo(request, '/studio/login', next === '/studio' ? '' : `?next=${encodeURIComponent(next)}`), s);
  }
  if (s.user && ENTRY_PAGES.test(pathname)) {
    return finish(redirectTo(request, safeStudioNext(request.nextUrl.searchParams.get('next'))), s);
  }
  return finish(NextResponse.next({request}), s);
}

export const config = {
  matcher: ['/studio', '/studio/:path*'],
};
