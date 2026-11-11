/**
 * Where to send someone after signing in: only a path inside /studio, never
 * another site. Rejects absolute and protocol-relative URLs, backslashes,
 * encoded tricks and anything outside /studio.
 */
export function safeStudioNext(value: unknown, fallback = '/studio'): string {
  if (typeof value !== 'string' || !value) return fallback;
  let path = value.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    return fallback;
  }
  if (!/^\/studio(\/[A-Za-z0-9\-_/]*)?(\?[A-Za-z0-9\-_=&%.]*)?$/.test(path)) return fallback;
  if (path.includes('//') || path.includes('\\') || path.includes('..')) return fallback;
  // Never bounce back into an auth page.
  if (/^\/studio\/(login|signup|forgot-password|update-password|confirm)(\/|\?|$)/.test(path)) return fallback;
  return path;
}
