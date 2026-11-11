'use client';

import {Fragment} from 'react';
import type {ReactNode} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Grid} from '@astryxdesign/core/Grid';
import {Reveal} from '@/components/motion/Reveal';
import {Parallax} from '@/components/motion/Parallax';
import {useTextReveal} from '@/motion/scroll';
import {CtaButton} from '@/components/navigation/CtaButton';
import {Lines} from '@/components/storytelling/Lines';
import {Container} from '@/components/layout/Container';
import {typeRole} from '@/theme/typeScale';
import {IndexLabel} from './IndexLabel';
import {RippleGrid} from '@/components/illustrations/RippleGrid';
import {EYEBROW_STYLE} from '@/theme/eyebrow';

type HeroAction = {label: string; href: string; direction?: 'forward' | 'down' | 'out'};

type EditorialHeroProps = {
  label?: string;
  /** "*word*" sets one word in the italic serif accent; "\n" breaks a line. */
  title: string;
  description?: string;
  action?: HeroAction;
  /** Short facts along the bottom edge, e.g. disciplines. */
  meta?: readonly string[];
  /** An illustration shown beside the description on wide screens. */
  illustration?: ReactNode;
  /** The shared hero headline size (hero-title) by default. */
  size?: 'hero-title' | 'display-xxl' | 'display-xl';
  /** Fill the viewport (homepage) or sit at natural height (inner pages). */
  isFullHeight?: boolean;
  /** Centre the text (only without an illustration). Left-aligned by default. */
  align?: 'start' | 'center';
  /** The column it sits in: the page's default, or the narrow reading column (case studies). */
  width?: 'default' | 'narrow';
  /** A dot grid behind it, fading down from the top, with a colour wave and pointer ripples. */
  hasBackdrop?: boolean;
};

/**
 * Left-aligned editorial hero: one very large title, one sentence, one
 * action, and a quiet meta row along the bottom. Space does the work. With
 * an illustration, the text block (label, title, description, action) sits
 * on the left and the illustration on the right, vertically centred against
 * each other from 1024px (.hero-split in globals.css); below that they stack.
 */
export function EditorialHero({
  label,
  title,
  description,
  action,
  meta,
  illustration,
  size = 'hero-title',
  isFullHeight = false,
  align = 'start',
  width = 'default',
  hasBackdrop = false,
}: EditorialHeroProps) {
  const titleRef = useTextReveal({delay: 0.1});
  const isCentered = align === 'center' && !illustration;
  /** Centred: each block centres itself and its text. */
  const centred = isCentered ? ({marginInline: 'auto', textAlign: 'center'} as const) : {};
  return (
    <VStack
      as="header"
      gap={0}
      justify="between"
      className={hasBackdrop ? 'hero-backdrop' : undefined}
      style={{
        minHeight: isFullHeight
          ? 'calc(100svh - var(--nav-padding-block) * 2 - var(--size-element-lg))'
          : undefined,
        paddingBlockStart: 'var(--space-chapter-gap)',
        paddingBlockEnd: 'var(--space-block)',
      }}>
      {hasBackdrop && <RippleGrid variant="hero" />}
      <Container gap={0} size={width} style={{flex: 1}}>
        <Grid
          columns={1}
          className={illustration ? 'hero-split' : undefined}
          style={{flex: 1, alignContent: 'center', gap: 'var(--space-block)'}}>
          <VStack
            gap={0}
            hAlign={isCentered ? 'center' : 'start'}
            style={{gap: 'var(--space-block)'}}>
            {label && (
              <Reveal>
                <IndexLabel>{label}</IndexLabel>
              </Reveal>
            )}
            {/* The title rises line by line out of its masks (useTextReveal). */}
            <Heading
              ref={titleRef}
              data-text-reveal
              level={1}
              textWrap="balance"
              style={{
                ...typeRole(size),
                // Beside an illustration it keeps a narrow measure; on its own
                // it can run the full width.
                maxInlineSize: illustration ? '14ch' : '24ch',
                ...centred,
              }}>
              <Lines text={title} />
            </Heading>
            {(description || action) && (
              <VStack gap={6}>
                {description && (
                  <Reveal delay={0.15}>
                    <Text
                      type="large"
                      color="secondary"
                      textWrap="pretty"
                      style={{maxInlineSize: illustration ? '36ch' : '60ch', ...centred}}>
                      <Lines text={description} />
                    </Text>
                  </Reveal>
                )}
                {action && (
                  <Reveal delay={0.22}>
                    <HStack>
                      <CtaButton {...action} />
                    </HStack>
                  </Reveal>
                )}
              </VStack>
            )}
          </VStack>
          {illustration && (
            <Reveal delay={0.1} hAlign="end">
              <Parallax amount={10}>{illustration}</Parallax>
            </Reveal>
          )}
        </Grid>
      </Container>
      {meta && meta.length > 0 && (
        <Container gap={0} size={width}>
          <Reveal delay={0.3}>
            {/* One line, the items joined by "•"; each item (with its dot)
              stays in one piece, so a wrap never leaves a dot dangling. */}
            <HStack
              className="hero-meta"
              style={{
                borderBlockStart: '1px solid var(--color-border)',
                paddingBlockStart: 'var(--spacing-4)',
                marginBlockStart: 'var(--space-block)',
              }}>
              <Text type="supporting" color="secondary" style={EYEBROW_STYLE}>
                {meta.map((item, index) => (
                  <Fragment key={item}>
                    <span style={{whiteSpace: 'nowrap'}}>
                      {item}
                      {index < meta.length - 1 && '\u00a0\u00a0•\u00a0'}
                    </span>
                    {index < meta.length - 1 && ' '}
                  </Fragment>
                ))}
              </Text>
            </HStack>
          </Reveal>
        </Container>
      )}
    </VStack>
  );
}
