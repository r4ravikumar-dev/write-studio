import {STUDIO_SESSION} from '@studio/shared';
import type {TokenPair} from './django';

export {STUDIO_SESSION};

type CookieOptions = {httpOnly: boolean; secure: boolean; sameSite: 'lax'; path: string; expires: Date};

/** httpOnly, SameSite=Lax, Secure in production, scoped to /studio. */
function options(expiresAt: string): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: STUDIO_SESSION.path,
    expires: new Date(expiresAt),
  };
}

export function sessionCookies(pair: TokenPair) {
  return [
    {name: STUDIO_SESSION.access, value: pair.access, options: options(pair.access_expires_at)},
    {name: STUDIO_SESSION.refresh, value: pair.refresh, options: options(pair.refresh_expires_at)},
  ];
}

export const clearedCookieOptions = {path: STUDIO_SESSION.path, expires: new Date(0)};
