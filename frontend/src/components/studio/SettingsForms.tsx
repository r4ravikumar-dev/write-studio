'use client';

import {useActionState, useState, useTransition} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Button} from '@astryxdesign/core/Button';
import {deleteMyAccount, saveDisplayName, savePassword, saveWorkspaceName, sendDeletionCode, type SettingsState} from '@/app/studio/account-actions';

const idle: SettingsState = {status: 'idle'};
const fieldError = (state: SettingsState, field: string) =>
  state.status === 'error' && (state.field === field || (!state.field && field === 'password'))
    ? {type: 'error' as const, message: state.message ?? ''}
    : undefined;
const Saved = ({state, label = 'Saved.'}: {state: SettingsState; label?: string}) =>
  state.status === 'saved' ? (
    <Text color="secondary" role="status">
      {label}
    </Text>
  ) : null;

function Section({title, intro, children}: {title: string; intro?: string; children: React.ReactNode}) {
  return (
    <VStack gap={4} className="studio-settings-section">
      <VStack gap={1}>
        <Heading level={2}>{title}</Heading>
        {intro && <Text color="secondary">{intro}</Text>}
      </VStack>
      {children}
    </VStack>
  );
}

/** The Studio account settings: name, workspace, password. */
export function SettingsForms({
  email,
  displayName,
  workspaceName,
  hasPassword,
}: {
  email: string;
  displayName: string;
  workspaceName: string;
  hasPassword: boolean;
}) {
  const [name, setName] = useState(displayName);
  const [workspace, setWorkspace] = useState(workspaceName);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [nameState, saveName, isSavingName] = useActionState(saveDisplayName, idle);
  const [workspaceState, saveWorkspace, isSavingWorkspace] = useActionState(saveWorkspaceName, idle);
  const [passwordState, savePw, isSavingPw] = useActionState(async (state: SettingsState, formData: FormData) => {
    const result = await savePassword(state, formData);
    if (result.status === 'saved') {
      setCurrent('');
      setPassword('');
      setAgain('');
    }
    return result;
  }, idle);

  return (
    <VStack gap={10}>
      <Section title="Profile" intro={`Signed in as ${email}.`}>
        <form action={saveName}>
          <VStack gap={3}>
            <TextInput label="Your name" htmlName="display_name" value={name} onChange={setName} autoComplete="name" width="100%" isRequired status={fieldError(nameState, 'display_name')} />
            <HStack gap={3} vAlign="center">
              <Button type="submit" label="Save name" variant="secondary" isLoading={isSavingName} />
              <Saved state={nameState} />
            </HStack>
          </VStack>
        </form>
      </Section>

      <Section title="Workspace">
        <form action={saveWorkspace}>
          <VStack gap={3}>
            <TextInput label="Workspace name" htmlName="name" value={workspace} onChange={setWorkspace} width="100%" isRequired status={fieldError(workspaceState, 'name')} />
            <HStack gap={3} vAlign="center">
              <Button type="submit" label="Save workspace name" variant="secondary" isLoading={isSavingWorkspace} />
              <Saved state={workspaceState} />
            </HStack>
          </VStack>
        </form>
      </Section>

      <Section
        title={hasPassword ? 'Password' : 'Add a password'}
        intro={
          hasPassword
            ? 'Changing your password signs you out on your other devices. You can still sign in with an email code at any time.'
            : 'You sign in with email codes. Add a password if you’d also like to sign in with one.'
        }>
        <form action={savePw}>
          <VStack gap={3}>
            {hasPassword && (
              <TextInput type="password" label="Current password" htmlName="current_password" value={current} onChange={setCurrent} autoComplete="current-password" width="100%" isRequired status={fieldError(passwordState, 'current_password')} />
            )}
            <TextInput type="password" label="New password" htmlName="password" value={password} onChange={setPassword} autoComplete="new-password" width="100%" isRequired description="Use at least 10 characters. Don’t use a common password or one made only of numbers." status={fieldError(passwordState, 'password')} />
            <TextInput type="password" label="Confirm new password" htmlName="password_again" value={again} onChange={setAgain} autoComplete="new-password" width="100%" isRequired status={fieldError(passwordState, 'password_again')} />
            <HStack gap={3} vAlign="center">
              <Button type="submit" label={hasPassword ? 'Change password' : 'Add password'} variant="secondary" isLoading={isSavingPw} />
              <Saved state={passwordState} label="Password saved." />
            </HStack>
          </VStack>
        </form>
      </Section>

      <DeleteAccount hasPassword={hasPassword} />
    </VStack>
  );
}

/** Deletes the account, its workspace, case studies and every uploaded file. */
function DeleteAccount({hasPassword}: {hasPassword: boolean}) {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [codeState, setCodeState] = useState<SettingsState>(idle);
  const [isSending, startSending] = useTransition();
  const [state, remove, isDeleting] = useActionState(deleteMyAccount, idle);

  return (
    <Section
      title="Delete account"
      intro="This permanently deletes your account, your workspace, all your case studies and every file you uploaded. You can’t undo it.">
      <form action={remove}>
        <VStack gap={3}>
          {hasPassword ? (
            <TextInput type="password" label="Your password" htmlName="password" value={password} onChange={setPassword} autoComplete="current-password" width="100%" isRequired status={fieldError(state, 'password')} />
          ) : (
            <VStack gap={2}>
              <HStack gap={3} vAlign="center">
                <Button
                  label="Email me a code"
                  variant="secondary"
                  isLoading={isSending}
                  onClick={() => startSending(async () => setCodeState(await sendDeletionCode()))}
                />
                {codeState.status === 'saved' && <Text color="secondary">{codeState.message}</Text>}
              </HStack>
              <TextInput
                label="6-digit code"
                htmlName="code"
                value={code}
                onChange={value => setCode(value.replace(/[^\d]/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                width="100%"
                isRequired
                status={fieldError(state, 'code') ?? (codeState.status === 'error' ? {type: 'error', message: codeState.message ?? ''} : undefined)}
              />
            </VStack>
          )}
          <TextInput label="Type DELETE to confirm" htmlName="confirm" value={confirm} onChange={setConfirm} width="100%" isRequired status={fieldError(state, 'confirm')} />
          {state.status === 'error' && !state.field && <Text role="alert">{state.message}</Text>}
          <HStack>
            <Button type="submit" label="Delete my account" variant="destructive" isLoading={isDeleting} isDisabled={confirm.trim().toLowerCase() !== 'delete'} />
          </HStack>
        </VStack>
      </form>
    </Section>
  );
}
