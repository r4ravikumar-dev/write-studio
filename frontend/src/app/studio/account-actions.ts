'use server';

import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {confirmAccountDeletion, deleteAccount, requestLoginCode, setPassword, updateProfile} from '@/lib/api/django';
import {api, errorMessage} from '@/lib/api/express';
import {clearSession, clientIp, dropSessionCookies, getAccessToken, setSession} from '@/lib/api/session';
import {requireStudioUser} from '@/lib/auth/current-user';

/** Signed-in Studio account actions (settings). Each re-checks the session. */
export type SettingsState = {status: 'idle' | 'saved' | 'error'; message?: string; field?: string};

const text = (formData: FormData, name: string) => String(formData.get(name) ?? '');

export async function saveDisplayName(_: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireStudioUser();
  const result = await updateProfile(await getAccessToken(), text(formData, 'display_name'));
  if (!result.ok) return {status: 'error', field: result.field, message: result.error};
  revalidatePath('/studio', 'layout');
  return {status: 'saved'};
}

export async function saveWorkspaceName(_: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireStudioUser();
  try {
    await api('/api/app/workspace', {method: 'PATCH', body: {name: text(formData, 'name')}, auth: true});
  } catch (error) {
    return {status: 'error', field: 'name', message: errorMessage(error, 'Couldn’t rename the workspace.')};
  }
  revalidatePath('/studio', 'layout');
  return {status: 'saved'};
}

/** Adds a password (accounts that sign in by code) or changes it. Signs other devices out. */
export async function savePassword(_: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireStudioUser();
  const password = text(formData, 'password');
  if (password !== text(formData, 'password_again')) {
    return {status: 'error', field: 'password_again', message: 'The passwords don’t match.'};
  }
  const result = await setPassword(await getAccessToken(), password, text(formData, 'current_password') || undefined);
  if (!result.ok) return {status: 'error', field: result.field, message: result.error};
  await setSession(result.data);
  revalidatePath('/studio/settings');
  return {status: 'saved'};
}

export async function signOutOfStudio() {
  await clearSession();
  // Drop every cached /studio page in this browser, so the next person to sign in never sees this one's.
  revalidatePath('/studio', 'layout');
  redirect('/studio/login');
}

/** For accounts without a password: emails a code to confirm deleting the account. */
export async function sendDeletionCode(): Promise<SettingsState> {
  const user = await requireStudioUser();
  const result = await requestLoginCode(user.email, await clientIp());
  return result.ok ? {status: 'saved', message: `We’ve emailed a code to ${user.email}.`} : {status: 'error', field: 'code', message: result.error};
}

/**
 * Deletes the signed-in account for good:
 *   1. Django checks it's really them (password, or a fresh email code) and gives a 5-minute token.
 *   2. The Express API removes every private file they own (the database can't cascade into Storage).
 *   3. Django deletes the account; the database cascades to the workspace, case studies and asset rows.
 * Then the Studio session cookies are cleared.
 */
export async function deleteMyAccount(_: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireStudioUser();
  if (text(formData, 'confirm').trim().toLowerCase() !== 'delete') {
    return {status: 'error', field: 'confirm', message: 'Type DELETE to confirm.'};
  }
  const token = await getAccessToken();
  const proof = text(formData, 'password') ? {password: text(formData, 'password')} : {code: text(formData, 'code').replace(/\s+/g, '')};
  const confirmed = await confirmAccountDeletion(token, proof);
  if (!confirmed.ok) return {status: 'error', field: confirmed.field ?? 'password', message: confirmed.error};
  try {
    await api('/api/app/account/storage', {method: 'DELETE', auth: true});
  } catch (error) {
    return {status: 'error', message: errorMessage(error, 'Your files couldn’t be removed, so nothing was deleted. Try again.')};
  }
  const deleted = await deleteAccount(token, confirmed.data.deletion_token);
  if (!deleted.ok) return {status: 'error', message: deleted.error};
  await dropSessionCookies();
  revalidatePath('/studio', 'layout');
  redirect('/studio/login?deleted=1');
}
