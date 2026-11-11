'use client';

import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {Plus} from 'lucide-react';

/** Opens project setup (the wizard). Creating happens there, with a form submission, never on a GET. */
export function NewCaseStudyButton({label = 'New case study'}: {label?: string}) {
  return <Button label={label} variant="primary" href="/studio/case-studies/new" icon={<Icon icon={Plus} size="sm" color="inherit" />} />;
}
