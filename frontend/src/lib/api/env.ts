/**
 * Where the backends are (server only; the browser never calls them):
 *   API_URL   the Express API (workspaces, case studies, media)
 *   AUTH_URL  the Django auth service (accounts, sign-in, tokens)
 * JWT_SECRET lets the proxy check access tokens without a round trip, and
 * AUTH_SERVICE_KEY proves to Django that the caller is this server.
 */
export const API_URL = (process.env.API_URL ?? '').replace(/\/+$/, '');
export const AUTH_URL = (process.env.AUTH_URL ?? '').replace(/\/+$/, '');
export const JWT_SECRET = process.env.JWT_SECRET ?? '';
export const AUTH_SERVICE_KEY = process.env.AUTH_SERVICE_KEY ?? '';

/** The Studio can run: both backends and the token secret are set. */
export const isBackendConfigured = Boolean(API_URL && AUTH_URL && JWT_SECRET);
