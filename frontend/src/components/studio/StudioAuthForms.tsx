'use client';

import {useActionState, useState} from 'react';
import NextLink from 'next/link';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Button} from '@astryxdesign/core/Button';
import {Banner} from '@astryxdesign/core/Banner';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {
  completePasswordReset,
  confirmStudioEmail,
  logInWithPassword,
  requestPasswordReset,
  sendStudioCode,
  signUpWithPassword,
  verifyStudioCode,
  type AuthFormState,
} from '@/app/studio/auth-actions';
import {EYEBROW_STYLE} from '@/theme/eyebrow';
import {Turnstile} from './Turnstile';

/**
 * The public Studio's sign-in, sign-up and recovery forms. Any email can
 * register (by password with a confirmation link, or by an email code); both
 * ways lead to the same account for the same email.
 */
const idle: AuthFormState = {status: 'idle'};

const fieldError = (state: AuthFormState, field: string) =>
  state.field === field && state.message ? {type: 'error' as const, message: state.message} : undefined;

/** A form-level message when it isn't about one field. */
function FormError({state}: {state: AuthFormState}) {
  if (state.status !== 'error' || !state.message || state.field) return null;
  return <Banner status="error" title={state.message} collapsible={false} />;
}

function AuthFrame({title, intro, children}: {title: string; intro: React.ReactNode; children: React.ReactNode}) {
  return (
    <VStack gap={8} className="studio-centered">
      <VStack gap={3}>
        <Text type="supporting" style={EYEBROW_STYLE}>
          Case Study Studio
        </Text>
        <Heading level={1}>{title}</Heading>
        <Text color="secondary">{intro}</Text>
      </VStack>
      {children}
    </VStack>
  );
}

const link = (href: string, label: string) => (
  <NextLink href={href} className="studio-auth-link">
    {label}
  </NextLink>
);

// ---------------------------------------------------------------------------
// Email code (sign in, or sign up on first use)
// ---------------------------------------------------------------------------
function CodeForm({next, askName, siteKey}: {next: string; askName: boolean; siteKey: string}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [again, setAgain] = useState(false);
  const [sent, send, isSending] = useActionState(sendStudioCode, idle);
  const [verified, verify, isVerifying] = useActionState(verifyStudioCode, {status: 'sent'} as AuthFormState);

  if (sent.status === 'sent' && !again) {
    return (
      <form action={verify}>
        <VStack gap={4}>
          <input type="hidden" name="email" value={sent.email ?? email} />
          <input type="hidden" name="display_name" value={sent.displayName ?? name} />
          <input type="hidden" name="next" value={next} />
          <TextInput
            label="6-digit code"
            htmlName="code"
            value={code}
            onChange={value => setCode(value.replace(/[^\d]/g, '').slice(0, 6))}
            autoComplete="one-time-code"
            inputMode="numeric"
            hasAutoFocus
            width="100%"
            description={`We sent it to ${sent.email}. It works once and expires in 10 minutes.`}
            status={verified.message ? {type: 'error', message: verified.message} : undefined}
          />
          <HStack gap={2} wrap="wrap">
            <Button type="submit" label="Continue" variant="primary" isLoading={isVerifying} />
            <Button
              label="Send a new code"
              variant="ghost"
              onClick={() => {
                setCode('');
                setAgain(true);
              }}
            />
          </HStack>
        </VStack>
      </form>
    );
  }

  return (
    <form
      action={formData => {
        setAgain(false);
        send(formData);
      }}>
      <VStack gap={4}>
        <FormError state={sent} />
        {askName && (
          <TextInput
            label="Your name"
            htmlName="display_name"
            value={name}
            onChange={setName}
            autoComplete="name"
            width="100%"
            isOptional
            description="We only use this if you’re new here."
          />
        )}
        <TextInput
          type="email"
          label="Email"
          htmlName="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          width="100%"
          isRequired
          status={fieldError(sent, 'email')}
        />
        <Turnstile siteKey={siteKey} resetKey={sent} action="code" />
        <Button type="submit" label="Email me a code" variant="primary" isLoading={isSending} />
      </VStack>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------
export function StudioLoginForm({next, notice, siteKey}: {next: string; notice?: string; siteKey: string}) {
  const [method, setMethod] = useState<'password' | 'code'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [state, logIn, isLoggingIn] = useActionState(logInWithPassword, idle);

  return (
    <AuthFrame
      title="Sign in"
      intro={<>New here? {link('/studio/signup', 'Create an account')}. Your case studies stay private to you.</>}>
      {notice && <Banner status="info" title={notice} collapsible={false} />}
      <SegmentedControl label="How to sign in" value={method} onChange={value => setMethod(value as 'password' | 'code')} layout="fill">
        <SegmentedControlItem value="password" label="Password" />
        <SegmentedControlItem value="code" label="Email code" />
      </SegmentedControl>
      {method === 'password' ? (
        <form action={logIn}>
          <VStack gap={4}>
            <FormError state={state} />
            <input type="hidden" name="next" value={next} />
            <TextInput
              type="email"
              label="Email"
              htmlName="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              width="100%"
              isRequired
              status={fieldError(state, 'email')}
            />
            <TextInput
              type="password"
              label="Password"
              htmlName="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              width="100%"
              isRequired
            />
            <HStack gap={4} vAlign="center" justify="between" wrap="wrap">
              <Button type="submit" label="Sign in" variant="primary" isLoading={isLoggingIn} />
              {link('/studio/forgot-password', 'Forgot your password?')}
            </HStack>
          </VStack>
        </form>
      ) : (
        <CodeForm next={next} askName={false} siteKey={siteKey} />
      )}
    </AuthFrame>
  );
}

// ---------------------------------------------------------------------------
// Sign up
// ---------------------------------------------------------------------------
export function StudioSignupForm({siteKey}: {siteKey: string}) {
  const [method, setMethod] = useState<'password' | 'code'>('password');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [state, signUp, isSigningUp] = useActionState(signUpWithPassword, idle);

  if (state.status === 'sent') {
    return (
      <AuthFrame title="Check your email" intro={`We’ve sent a link to ${state.email}. Open it to confirm your email address and start writing.`}>
        <Text color="secondary">
          Nothing arrived after a few minutes? Check your spam folder, or {link('/studio/login', 'sign in with an email code')} instead.
        </Text>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title="Create your account"
      intro={<>Get a private workspace for writing your case studies. Already have an account? {link('/studio/login', 'Sign in')}.</>}>
      <SegmentedControl label="How to sign up" value={method} onChange={value => setMethod(value as 'password' | 'code')} layout="fill">
        <SegmentedControlItem value="password" label="With a password" />
        <SegmentedControlItem value="code" label="With an email code" />
      </SegmentedControl>
      {method === 'password' ? (
        <form action={signUp}>
          <VStack gap={4}>
            <FormError state={state} />
            <TextInput label="Your name" htmlName="display_name" value={name} onChange={setName} autoComplete="name" width="100%" isRequired status={fieldError(state, 'display_name')} />
            <TextInput type="email" label="Email" htmlName="email" value={email} onChange={setEmail} autoComplete="email" width="100%" isRequired status={fieldError(state, 'email')} />
            <TextInput
              type="password"
              label="Password"
              htmlName="password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              width="100%"
              isRequired
              description="Use at least 10 characters. Don’t use a common password or one made only of numbers."
              status={fieldError(state, 'password')}
            />
            <TextInput type="password" label="Confirm password" htmlName="password_again" value={again} onChange={setAgain} autoComplete="new-password" width="100%" isRequired status={fieldError(state, 'password_again')} />
            <Turnstile siteKey={siteKey} resetKey={state} action="signup" />
            <Button type="submit" label="Create account" variant="primary" isLoading={isSigningUp} />
          </VStack>
        </form>
      ) : (
        <CodeForm next="/studio" askName siteKey={siteKey} />
      )}
    </AuthFrame>
  );
}

// ---------------------------------------------------------------------------
// Confirm email (from the link) — a button, so link scanners can't use it up
// ---------------------------------------------------------------------------
export function StudioConfirmForm({token}: {token: string}) {
  const [state, confirm, isConfirming] = useActionState(confirmStudioEmail, idle);
  return (
    <AuthFrame title="Confirm your email" intro="Confirm your email address to open your workspace.">
      <form action={confirm}>
        <VStack gap={4}>
          <FormError state={state} />
          <input type="hidden" name="token" value={token} />
          <Button type="submit" label="Confirm and continue" variant="primary" isLoading={isConfirming} isDisabled={!token} />
        </VStack>
      </form>
    </AuthFrame>
  );
}

// ---------------------------------------------------------------------------
// Forgot / reset password
// ---------------------------------------------------------------------------
export function StudioForgotPasswordForm({siteKey}: {siteKey: string}) {
  const [email, setEmail] = useState('');
  const [state, request, isRequesting] = useActionState(requestPasswordReset, idle);
  if (state.status === 'sent') {
    return (
      <AuthFrame title="Check your email" intro={`If ${state.email} has an account, we’ve sent it a link to choose a new password. The link works for one hour.`}>
        {link('/studio/login', 'Back to sign in')}
      </AuthFrame>
    );
  }
  return (
    <AuthFrame title="Reset your password" intro={<>Enter your email address and we’ll send you a link to choose a new password. Or {link('/studio/login', 'sign in with an email code')} instead.</>}>
      <form action={request}>
        <VStack gap={4}>
          <FormError state={state} />
          <TextInput type="email" label="Email" htmlName="email" value={email} onChange={setEmail} autoComplete="email" width="100%" isRequired status={fieldError(state, 'email')} />
          <Turnstile siteKey={siteKey} resetKey={state} action="reset" />
          <Button type="submit" label="Email me a link" variant="primary" isLoading={isRequesting} />
        </VStack>
      </form>
    </AuthFrame>
  );
}

export function StudioResetPasswordForm({uid, token}: {uid: string; token: string}) {
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [state, reset, isResetting] = useActionState(completePasswordReset, idle);
  return (
    <AuthFrame title="Choose a new password" intro="When you save it, you’ll be signed in here and signed out on your other devices.">
      <form action={reset}>
        <VStack gap={4}>
          <FormError state={state} />
          <input type="hidden" name="uid" value={uid} />
          <input type="hidden" name="token" value={token} />
          <TextInput type="password" label="New password" htmlName="password" value={password} onChange={setPassword} autoComplete="new-password" width="100%" isRequired description="Use at least 10 characters. Don’t use a common password or one made only of numbers." status={fieldError(state, 'password')} />
          <TextInput type="password" label="Confirm new password" htmlName="password_again" value={again} onChange={setAgain} autoComplete="new-password" width="100%" isRequired status={fieldError(state, 'password_again')} />
          <Button type="submit" label="Save and sign in" variant="primary" isLoading={isResetting} isDisabled={!uid || !token} />
        </VStack>
      </form>
    </AuthFrame>
  );
}
