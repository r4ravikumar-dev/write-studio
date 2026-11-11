import 'server-only';
import {API_URL} from './env';
import {getAccessToken} from './session';

/** An answer from the Express API that wasn't a success. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Sends the signed-in user's access token. */
  auth?: boolean;
};

/** Calls the Express API from the server. Throws ApiError on any non-2xx answer. */
export async function api<T>(path: string, {method = 'GET', body, auth = false}: Options = {}): Promise<T> {
  if (!API_URL) throw new ApiError(503, 'The API isn’t configured (API_URL).');
  const headers: Record<string, string> = {Accept: 'application/json'};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await getAccessToken();
    if (!token) throw new ApiError(401, 'Signed out.');
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      // Everything here is per-user: never cached.
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(503, 'The API can’t be reached. Try again in a minute.');
  }
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new ApiError(response.status, String(data.error ?? `Request failed (${response.status}).`), data);
  return data as T;
}

/** An error's message for the person using the studio. */
export const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
