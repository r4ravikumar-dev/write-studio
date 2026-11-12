'use client';

import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {Plus} from 'lucide-react';

/** Opens Create Document (the wizard). Creating happens there, with a form submission, never on a GET. */
export function NewCaseStudyButton({label = 'Create document'}: {label?: string}) {
  return <Button label={label} variant="primary" href="/studio/documents/new" icon={<Icon icon={Plus} size="sm" color="inherit" />} />;
}
