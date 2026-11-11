import 'server-only';
import {cookies, headers} from 'next/headers';
import {STUDIO_SESSION, clearedCookieOptions, sessionCookies} from './cookies';
import {revokeRefreshToken, type TokenPair} from './django';
import {verifyAccessToken} from './jwt';

/** The signed-in account (from the access-token cookie), or null. */
export async function getSessionUser() {
  return verifyAccessToken((await cookies()).get(STUDIO_SESSION.access)?.value);
}

/** The access token to send to the Express API or Django. */
export async function getAccessToken() {
  return (await cookies()).get(STUDIO_SESSION.access)?.value ?? '';
}

/** Stores a new session (server actions only: cookies are read-only in pages). */
export async function setSession(pair: TokenPair) {
  const store = await cookies();
  sessionCookies(pair).forEach(({name, value, options}) => store.set(name, value, options));
}

/** Clears both cookies (without contacting Django). */
export async function dropSessionCookies() {
  const store = await cookies();
  store.set(STUDIO_SESSION.access, '', clearedCookieOptions);
  store.set(STUDIO_SESSION.refresh, '', clearedCookieOptions);
}

/** Signs out: revokes the refresh token with Django and clears both cookies. */
export async function clearSession() {
  const refresh = (await cookies()).get(STUDIO_SESSION.refresh)?.value;
  if (refresh) await revokeRefreshToken(refresh);
  await dropSessionCookies();
}

/** The visitor's address (for Django's rate limits). */
export async function clientIp() {
  const list = await headers();
  return list.get('x-forwarded-for')?.split(',')[0]?.trim() || list.get('x-real-ip') || '';
}
