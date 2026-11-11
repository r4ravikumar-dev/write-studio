import {jwtVerify} from 'jose';
import {JWT_AUDIENCE, JWT_ISSUER, type AccessClaims} from '@studio/shared';
import {JWT_SECRET} from './env';

const secret = new TextEncoder().encode(JWT_SECRET);

export type SessionUser = {id: string; email: string};

/** The account in a valid access token from the Django auth service, or null. */
export async function verifyAccessToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token || !JWT_SECRET) return null;
  try {
    const {payload} = await jwtVerify<AccessClaims>(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256'],
    });
    if (payload.type !== 'access' || payload.role !== 'user') return null;
    return {id: payload.sub, email: payload.email};
  } catch {
    return null;
  }
}
