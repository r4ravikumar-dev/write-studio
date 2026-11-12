/** The public support address for the contact page, or null when it isn't configured. Server-only. */
export function supportEmail(): string | null {
  const value = (process.env.SUPPORT_EMAIL ?? '').trim();
  return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(value) ? value : null;
}
