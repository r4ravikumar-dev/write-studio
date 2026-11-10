import type {NextFunction, Request, Response} from 'express';
import {jwtVerify} from 'jose';
import {JWT_AUDIENCE, JWT_ISSUER, type AccessClaims} from '@studio/shared';
import {env} from '../config/env';
import {HttpError} from '../lib/http';

const secret = new TextEncoder().encode(env.jwtSecret);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StudioUser = {id: string; email: string; role: AccessClaims['role']};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: StudioUser;
    }
  }
}

/** A valid access token from the Django auth service, or a 401. */
async function accessClaims(req: Request): Promise<AccessClaims> {
  const header = req.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'Signed out.');
  try {
    const {payload} = await jwtVerify<AccessClaims>(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256'],
    });
    if (payload.type !== 'access' || payload.role !== 'user' || !UUID.test(payload.sub ?? '') || !payload.email) throw new Error('bad claims');
    return payload;
  } catch {
    throw new HttpError(401, 'Signed out.');
  }
}

/**
 * Every API route: any signed-in account (all accounts are equal). Every
 * query must be scoped to req.user.id; the id comes only from the verified token.
 */
export async function requireUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const claims = await accessClaims(req);
    req.user = {id: claims.sub, email: claims.email, role: claims.role};
    next();
  } catch (error) {
    next(error);
  }
}
