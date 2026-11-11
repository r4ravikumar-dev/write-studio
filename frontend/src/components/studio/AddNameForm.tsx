'use client';

import {useActionState, useState} from 'react';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Button} from '@astryxdesign/core/Button';
import {saveDisplayName, type SettingsState} from '@/app/studio/account-actions';

/**
 * Accounts made with an email code have no name yet (the code form can't ask without revealing
 * whether an account exists). The workspace asks once, here; it's also in Settings.
 */
export function AddNameForm() {
  const [state, action, isPending] = useActionState<SettingsState, FormData>(saveDisplayName, {status: 'idle'});
  const [name, setName] = useState('');
  return (
    <form action={action} className="studio-name-prompt">
      <VStack gap={3}>
        <Text>What should we call you?</Text>
        <HStack gap={2} vAlign="end" wrap="wrap">
          <TextInput
            label="Your name"
            htmlName="display_name"
            value={name}
            onChange={setName}
            autoComplete="name"
            isRequired
            status={state.status === 'error' && state.message ? {type: 'error', message: state.message} : undefined}
          />
          <Button type="submit" label="Save name" variant="secondary" isLoading={isPending} />
        </HStack>
      </VStack>
    </form>
  );
}
