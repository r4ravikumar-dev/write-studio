'use client';

import {useTransition} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {Plus} from 'lucide-react';
import {createStudioCaseStudy} from '@/app/studio/case-study-actions';

/** Starts a private draft from the template and opens the editor. */
export function NewCaseStudyButton({label = 'New case study'}: {label?: string}) {
  const [isCreating, start] = useTransition();
  return (
    <Button
      label={label}
      variant="primary"
      isLoading={isCreating}
      onClick={() => start(() => createStudioCaseStudy())}
      icon={<Icon icon={Plus} size="sm" color="inherit" />}
    />
  );
}
