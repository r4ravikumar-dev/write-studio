import 'server-only';

/**
 * Bot protection (Cloudflare Turnstile) for the public forms that send email:
 * sign-up, "Email me a code" and "Forgot your password". The browser widget
 * gives a single-use token; this server checks it with Cloudflare before the
 * Django auth service is called, so a bot can't skip the check by posting
 * straight to the server action.
 *
 * On when both keys are set (TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY);
 * off in local development without them. Signed-in flows aren't checked.
 */
const SITE_KEY = process.env.TURNSTILE_SITE_KEY?.trim() ?? '';
const SECRET_KEY = process.env.TURNSTILE_SECRET_KEY?.trim() ?? '';
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** The field the widget fills in. */
export const TURNSTILE_FIELD = 'cf-turnstile-response';

export const isTurnstileOn = Boolean(SITE_KEY && SECRET_KEY);

/** The public site key for the widget, or '' when the check is off. */
export const turnstileSiteKey = () => (isTurnstileOn ? SITE_KEY : '');

/** Null when the visitor passed (or the check is off), otherwise the message to show. */
export async function checkHuman(formData: FormData, ip: string): Promise<string | null> {
  if (!isTurnstileOn) return null;
  const token = String(formData.get(TURNSTILE_FIELD) ?? '').trim();
  if (!token) return 'Wait for the security check under the form to finish, then try again.';
  if (token.length > 2048) return 'The security check didn’t work. Reload the page and try again.';
  const body = new URLSearchParams({secret: SECRET_KEY, response: token});
  if (ip) body.set('remoteip', ip);
  try {
    const response = await fetch(VERIFY_URL, {method: 'POST', body, cache: 'no-store', signal: AbortSignal.timeout(8000)});
    const result = (await response.json()) as {success?: boolean; 'error-codes'?: string[]};
    if (result.success) return null;
    const codes = result['error-codes'] ?? [];
    if (codes.includes('timeout-or-duplicate')) return 'The security check expired. Try again.';
    if (codes.some(code => code.startsWith('missing-input-secret') || code.startsWith('invalid-input-secret'))) {
      console.error('[turnstile] the secret key is missing or wrong');
      return 'This form isn’t available right now. Try again in a few minutes.';
    }
    return 'We couldn’t confirm you’re a person. Reload the page and try again.';
  } catch {
    console.error('[turnstile] Cloudflare could not be reached');
    return 'The security check can’t be reached. Try again in a minute.';
  }
}
