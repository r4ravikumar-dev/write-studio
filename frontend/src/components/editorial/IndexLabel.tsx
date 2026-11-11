'use client';

import {HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {EYEBROW_STYLE} from '@/theme/eyebrow';

type IndexLabelProps = {
  /** Section number, e.g. 1 renders "01". Omit for an unnumbered label. */
  index?: number;
  children: string;
};

const labelStyle = EYEBROW_STYLE;

/**
 * The quiet structural voice of a page: "01" then a hairline then "PRACTICE".
 * Organises sections without boxes.
 */
export function IndexLabel({index, children}: IndexLabelProps) {
  return (
    <HStack gap={3} vAlign="center">
      {index !== undefined && (
        <Text type="supporting" color="secondary" hasTabularNumbers style={labelStyle}>
          {String(index).padStart(2, '0')}
        </Text>
      )}
      {index !== undefined && (
        <span
          aria-hidden
          style={{
            display: 'block',
            inlineSize: 'var(--spacing-8)',
            blockSize: '1px',
            backgroundColor: 'var(--color-border-emphasized)',
          }}
        />
      )}
      <Text type="supporting" color="secondary" style={labelStyle}>
        {children}
      </Text>
    </HStack>
  );
}
