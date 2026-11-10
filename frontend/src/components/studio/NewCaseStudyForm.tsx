'use client';

import {useState} from 'react';
import {useFormStatus} from 'react-dom';
import {VStack} from '@astryxdesign/core/Layout';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Button} from '@astryxdesign/core/Button';
import {createStudioCaseStudy} from '@/app/studio/case-study-actions';

function Submit() {
  const {pending} = useFormStatus();
  return <Button type="submit" label="Start writing" variant="primary" isLoading={pending} />;
}

export function NewCaseStudyForm() {
  const [title, setTitle] = useState('');
  return (
    <form action={createStudioCaseStudy}>
      <VStack gap={4}>
        <TextInput label="Working title" htmlName="title" value={title} onChange={setTitle} width="100%" isOptional description="You can change it any time." />
        <Submit />
      </VStack>
    </form>
  );
}
