'use server';

import {redirect} from 'next/navigation';
import {
  confirmEmail,
  forgotPassword,
  logIn,
  requestLoginCode,
  resetPassword,
  signUp,
  verifyLoginCode,
} from '@/lib/api/django';
import {isBackendConfigured} from '@/lib/api/env';
import {clientIp, setSession} from '@/lib/api/session';
import {safeStudioNext} from '@/lib/auth/safe-next';

/**
 * Sign-in, sign-up and recovery actions. They only talk to the Django auth
 * service; on success the tokens become httpOnly cookies scoped to /studio.
 */
export type AuthFormState = {
  status: 'idle' | 'error' | 'sent' | 'done';
  message?: string;
  /** Which field the message is about. */
  field?: string;
  email?: string;
  displayName?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (formData: FormData, name: string) => String(formData.get(name) ?? '');
const emailOf = (formData: FormData) => text(formData, 'email').trim().toLowerCase();
const notConfigured: AuthFormState = {status: 'error', message: 'Sign-in isn’t available right now. Try again in a few minutes.'};

/** Email and password sign-in. */
export async function logInWithPassword(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isBackendConfigured) return notConfigured;
  const email = emailOf(formData);
  if (!EMAIL.test(email)) return {status: 'error', field: 'email', message: 'Enter an email address in the format name@example.com.', email};
  const result = await logIn(email, text(formData, 'password'), await clientIp());
  if (!result.ok) return {status: 'error', message: result.error, email};
  await setSession(result.data);
  redirect(safeStudioNext(text(formData, 'next')));
}

/** Step 1 of code sign-in (also signs up a new email). */
export async function sendStudioCode(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isBackendConfigured) return notConfigured;
  const email = emailOf(formData);
  const displayName = text(formData, 'display_name').trim().slice(0, 80);
  if (!EMAIL.test(email)) return {status: 'error', field: 'email', message: 'Enter an email address in the format name@example.com.', email};
  const result = await requestLoginCode(email, await clientIp());
  if (!result.ok) return {status: 'error', message: result.error, email, displayName};
  return {status: 'sent', email, displayName};
}

/** Step 2 of code sign-in. */
export async function verifyStudioCode(state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = emailOf(formData) || state.email || '';
  const displayName = text(formData, 'display_name') || state.displayName || '';
  const code = text(formData, 'code').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(code)) {
    return {status: 'sent', field: 'code', message: 'Enter the 6-digit code from the email.', email, displayName};
  }
  const result = await verifyLoginCode(email, code, await clientIp(), displayName || undefined);
  if (!result.ok) return {status: 'sent', field: 'code', message: result.error, email, displayName};
  await setSession(result.data);
  redirect(safeStudioNext(text(formData, 'next')));
}

/** Email and password sign-up: sends a confirmation link. */
export async function signUpWithPassword(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isBackendConfigured) return notConfigured;
  const email = emailOf(formData);
  const displayName = text(formData, 'display_name').trim();
  const password = text(formData, 'password');
  if (!displayName) return {status: 'error', field: 'display_name', message: 'Enter your name.', email, displayName};
  if (!EMAIL.test(email)) return {status: 'error', field: 'email', message: 'Enter an email address in the format name@example.com.', email, displayName};
  if (password !== text(formData, 'password_again')) {
    return {status: 'error', field: 'password_again', message: 'The passwords don’t match. Enter the same password in both fields.', email, displayName};
  }
  const result = await signUp(email, password, displayName, await clientIp());
  if (!result.ok) return {status: 'error', field: result.field, message: result.error, email, displayName};
  return {status: 'sent', email, displayName};
}

/** The confirmation link's button (a button, so email scanners can't use the link up). */
export async function confirmStudioEmail(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const result = await confirmEmail(text(formData, 'token'), await clientIp());
  if (!result.ok) return {status: 'error', message: result.error};
  await setSession(result.data);
  redirect('/studio');
}

/** Sends a password reset link (same reply whether or not the email has an account). */
export async function requestPasswordReset(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isBackendConfigured) return notConfigured;
  const email = emailOf(formData);
  if (!EMAIL.test(email)) return {status: 'error', field: 'email', message: 'Enter an email address in the format name@example.com.', email};
  const result = await forgotPassword(email, await clientIp());
  if (!result.ok) return {status: 'error', message: result.error, email};
  return {status: 'sent', email};
}

/** Sets a new password from a reset link, then signs in. */
export async function completePasswordReset(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const password = text(formData, 'password');
  if (password !== text(formData, 'password_again')) {
    return {status: 'error', field: 'password_again', message: 'The passwords don’t match. Enter the same password in both fields.'};
  }
  const result = await resetPassword(text(formData, 'uid'), text(formData, 'token'), password, await clientIp());
  if (!result.ok) return {status: 'error', field: result.field, message: result.error};
  await setSession(result.data);
  redirect('/studio');
}
