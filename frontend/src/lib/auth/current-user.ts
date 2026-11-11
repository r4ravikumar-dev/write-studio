import 'server-only';
import {redirect} from 'next/navigation';
import type {StudioWorkspace} from '@studio/shared';
import {getAccount, type AccountUser} from '@/lib/api/django';
import {api} from '@/lib/api/express';
import {getAccessToken, getSessionUser} from '@/lib/api/session';

/** Identity helpers. Every verified account is an ordinary user; there is no owner or admin. */

/** The account signed in to /studio (verified token), or null. */
export const getCurrentUser = () => getSessionUser();

/** The signed-in Studio account, or a redirect to /studio/login. */
export async function requireStudioUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/studio/login');
  return user;
}

/** The account's details from Django (name, whether it has a password). */
export async function getAccountDetails(): Promise<AccountUser | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const result = await getAccount(token);
  return result.ok ? result.data.user : null;
}

/** The signed-in account's personal workspace, from the Express API. */
export async function getPersonalWorkspace(): Promise<StudioWorkspace> {
  return (await api<{workspace: StudioWorkspace}>('/api/app/workspace', {auth: true})).workspace;
}
