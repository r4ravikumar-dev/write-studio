import {AUTH_SERVICE_KEY, AUTH_URL} from './env';

/** What the Django auth service returns whenever someone signs in. */
export type TokenPair = {
  access: string;
  refresh: string;
  access_expires_at: string;
  refresh_expires_at: string;
  user: {id: string; email: string; display_name: string; role: 'user'};
};

export type AccountUser = {
  id: string;
  email: string;
  display_name: string;
  role: 'user';
  has_password: boolean;
  email_verified: boolean;
};

export type AuthResult<T> =
  | {ok: true; data: T}
  | {ok: false; status: number; error: string; field?: string; code?: string};

type CallOptions = {method?: 'GET' | 'POST'; body?: Record<string, unknown>; ip?: string; token?: string};

/**
 * Calls the Django auth service, server to server: the service key proves the
 * caller is this app, X-Client-IP carries the visitor's address for rate
 * limits, and `token` is an access token for the signed-in endpoints.
 */
async function call<T>(path: string, {method = 'POST', body, ip, token}: CallOptions = {}): Promise<AuthResult<T>> {
  const headers: Record<string, string> = {'X-Service-Key': AUTH_SERVICE_KEY};
  if (body) headers['Content-Type'] = 'application/json';
  if (ip) headers['X-Client-IP'] = ip;
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const response = await fetch(`${AUTH_URL}/api/auth/${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: String(data.error ?? 'Something went wrong. Try again.'),
        field: data.field,
        code: data.code,
      };
    }
    return {ok: true, data: data as T};
  } catch {
    return {ok: false, status: 503, error: 'The sign-in service can’t be reached. Try again in a minute.'};
  }
}

export const requestLoginCode = (email: string, ip?: string) => call<{status: 'sent'}>('request-code', {body: {email}, ip});
export const verifyLoginCode = (email: string, code: string, ip?: string, displayName?: string) =>
  call<TokenPair>('verify-code', {body: {email, code, display_name: displayName}, ip});
export const signUp = (email: string, password: string, displayName: string, ip?: string) =>
  call<{status: 'check-email'}>('signup', {body: {email, password, display_name: displayName}, ip});
export const confirmEmail = (token: string, ip?: string) => call<TokenPair>('confirm-email', {body: {token}, ip});
export const logIn = (email: string, password: string, ip?: string) =>
  call<TokenPair>('login', {body: {email, password}, ip});
export const forgotPassword = (email: string, ip?: string) =>
  call<{status: 'check-email'}>('forgot-password', {body: {email}, ip});
export const resetPassword = (uid: string, token: string, password: string, ip?: string) =>
  call<TokenPair>('reset-password', {body: {uid, token, password}, ip});
export const getAccount = (token: string) => call<{user: AccountUser}>('me', {method: 'GET', token});
export const updateProfile = (token: string, displayName: string) =>
  call<{user: AccountUser}>('update-profile', {body: {display_name: displayName}, token});
export const setPassword = (token: string, password: string, currentPassword?: string) =>
  call<TokenPair>('set-password', {body: {password, current_password: currentPassword}, token});
export const refreshTokens = (refresh: string) => call<TokenPair>('refresh', {body: {refresh}});
export const revokeRefreshToken = (refresh: string) => call<{status: string}>('logout', {body: {refresh}});
export const confirmAccountDeletion = (token: string, proof: {password?: string; code?: string}) =>
  call<{deletion_token: string; expires_in: number}>('delete-account/confirm', {body: proof, token});
export const deleteAccount = (token: string, deletionToken: string) =>
  call<{status: 'deleted'}>('delete-account', {body: {deletion_token: deletionToken}, token});
