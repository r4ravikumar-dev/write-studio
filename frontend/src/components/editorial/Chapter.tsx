'use client';

import type {ReactNode} from 'react';
import {VStack} from '@astryxdesign/core/Layout';
import {Container} from '@/components/layout/Container';

type ChapterProps = {
  id?: string;
  /**
   * "default" sits on the page surface; "muted" uses the theme's muted surface
   * to set a chapter apart. Both follow the device's light or dark mode: no
   * section ever flips to the opposite scheme.
   */
  tone?: 'default' | 'muted';
  /** Take at least the full viewport height, with content centred vertically. */
  isFullHeight?: boolean;
  /** Content width: the default 1280px column or a narrow reading column. */
  width?: 'default' | 'narrow' | 'reading';
  /** Accessible name for the section landmark. */
  label?: string;
  /** Extra class on the section, for a chapter with its own backdrop. */
  className?: string;
  children: ReactNode;
};

/**
 * One chapter of a page: a section with the generous vertical rhythm of the
 * space scale (--space-section), so each idea gets its own screen.
 */
export function Chapter({
  id,
  tone = 'default',
  isFullHeight = false,
  width = 'default',
  label,
  className,
  children,
}: ChapterProps) {
  return (
    <VStack
      as="section"
      id={id}
      aria-label={label}
      className={className}
      justify={isFullHeight ? 'center' : undefined}
      style={{
        paddingBlock: 'var(--space-section)',
        minHeight: isFullHeight ? '100svh' : undefined,
        backgroundColor: tone === 'muted' ? 'var(--color-background-muted)' : undefined,
      }}>
      <Container size={width} gap={0}>
        <VStack gap={0} style={{gap: 'var(--space-chapter-gap)'}}>
          {children}
        </VStack>
      </Container>
    </VStack>
  );
}
