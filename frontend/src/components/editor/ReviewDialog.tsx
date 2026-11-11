'use client';

import type {Editor} from '@tiptap/react';
import {NodeSelection, TextSelection} from '@tiptap/pm/state';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Heading';
import {Button} from '@astryxdesign/core/Button';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {Icon} from '@astryxdesign/core/Icon';
import {CheckCircle2, Circle} from 'lucide-react';
import {REVIEW_CATEGORIES, progressLabel, type ReviewCategory, type ReviewWarning, type StoryReview} from '@studio/shared';
import {addSection, goToSection, outlineOf} from './sections';

/**
 * Review (Stage 5): the story completeness checklist, section progress, and every warning grouped
 * by kind, each with a direct action ("Go to section", "Go to block", "Open details"). Worked out
 * from the document as it is now; nothing here is stored or scored.
 */
export function ReviewDialog({
  editor,
  review,
  isOpen,
  onClose,
  onOpenDetails,
}: {
  editor: Editor;
  review: StoryReview | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenDetails: () => void;
}) {
  if (!review) return null;
  const fixes = review.warnings.filter(warning => warning.severity === 'fix').length;
  const considers = review.warnings.length - fixes;
  const covered = review.checklist.filter(item => item.done).length;

  const goToSectionId = (sectionId: string) => {
    const section = outlineOf(editor.state.doc).find(item => item.id === sectionId);
    onClose();
    if (section) requestAnimationFrame(() => goToSection(editor, section));
  };
  const goToBlock = (index: number) => {
    onClose();
    requestAnimationFrame(() => {
      const {doc} = editor.state;
      if (index >= doc.childCount) return;
      let pos = 0;
      for (let i = 0; i < index; i += 1) pos += doc.child(i).nodeSize;
      const node = doc.child(index);
      const selection = node.isAtom || !node.isTextblock ? NodeSelection.create(doc, pos) : TextSelection.near(doc.resolve(pos + 1));
      editor.view.dispatch(editor.state.tr.setSelection(selection).scrollIntoView());
      editor.view.focus();
      const dom = editor.view.nodeDOM(pos);
      if (dom instanceof HTMLElement) dom.scrollIntoView({block: 'center'});
    });
  };
  const action = (warning: ReviewWarning) => {
    if (warning.inDetails) return <Button label="Open details" size="sm" variant="ghost" onClick={() => {
          onClose();
          onOpenDetails();
        }} />;
    if (warning.nodeIndex !== null) return <Button label="Go to block" size="sm" variant="ghost" onClick={() => goToBlock(warning.nodeIndex!)} />;
    if (warning.sectionId) return <Button label="Go to section" size="sm" variant="ghost" onClick={() => goToSectionId(warning.sectionId!)} />;
    return null;
  };
  const groups = (Object.keys(REVIEW_CATEGORIES) as ReviewCategory[])
    .map(category => ({category, items: review.warnings.filter(warning => warning.category === category)}))
    .filter(group => group.items.length);

  return (
    <Dialog isOpen={isOpen} onOpenChange={open => !open && onClose()} width={720} maxHeight="88dvh">
      <DialogHeader
        title="Review"
        subtitle={
          review.warnings.length
            ? [fixes && `${fixes} to fix`, considers && `${considers} to consider`].filter(Boolean).join(' · ')
            : 'Nothing to fix. The story is ready to share.'
        }
        onOpenChange={open => !open && onClose()}
      />
      <VStack gap={8} className="review">
        <VStack gap={3}>
          <HStack justify="between" vAlign="end" gap={3} wrap="wrap">
            <Heading level={3} style={{fontSize: 'var(--type-headline-s-size)'}}>
              Sections
            </Heading>
            <Text type="supporting" color="secondary">
              {progressLabel(review.progress) || 'No sections yet'}
            </Text>
          </HStack>
          {review.progress.total > 0 && <ProgressBar progress={review.progress} />}
        </VStack>

        <VStack gap={3}>
          <HStack justify="between" vAlign="end" gap={3} wrap="wrap">
            <Heading level={3} style={{fontSize: 'var(--type-headline-s-size)'}}>
              Story checklist
            </Heading>
            <Text type="supporting" color="secondary">
              {covered} of {review.checklist.length} covered
            </Text>
          </HStack>
          <ul className="review-list">
            {review.checklist.map(item => (
              <li key={item.key} className="review-item" data-done={item.done || undefined}>
                <span className="review-icon" aria-hidden="true">
                  <Icon icon={item.done ? CheckCircle2 : Circle} size="sm" color="inherit" />
                </span>
                <VStack gap={0} className="review-text">
                  <Text weight="semibold">
                    {item.label}
                    <span className="sr-only">{item.done ? ': covered' : ': not covered yet'}</span>
                  </Text>
                  <Text type="supporting" color="secondary">
                    {item.description}
                  </Text>
                </VStack>
                {item.sectionId ? (
                  <Button label="Go to section" size="sm" variant="ghost" onClick={() => goToSectionId(item.sectionId!)} />
                ) : item.addKey ? (
                  <Button
                    label="Add section"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onClose();
                      requestAnimationFrame(() => addSection(editor, null, item.addKey));
                    }}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </VStack>

        {groups.map(group => (
          <VStack key={group.category} gap={3}>
            <Heading level={3} style={{fontSize: 'var(--type-headline-s-size)'}}>
              {REVIEW_CATEGORIES[group.category]} ({group.items.length})
            </Heading>
            <ul className="review-list">
              {group.items.map(warning => (
                <li key={warning.id} className="review-item" data-severity={warning.severity}>
                  <span className="review-badge t-web-label-md-semibold">{warning.severity === 'fix' ? 'Fix' : 'Consider'}</span>
                  <VStack gap={0} className="review-text">
                    <Text>{warning.message}</Text>
                    <Text type="supporting" color="secondary">
                      {warning.fix}
                    </Text>
                  </VStack>
                  {action(warning)}
                </li>
              ))}
            </ul>
          </VStack>
        ))}
      </VStack>
    </Dialog>
  );
}

/** Complete / review / in progress / not started, as one segmented bar with a text legend. */
function ProgressBar({progress}: {progress: StoryReview['progress']}) {
  const parts = [
    {key: 'complete', value: progress.complete, label: 'complete'},
    {key: 'review', value: progress.review, label: 'for review'},
    {key: 'in_progress', value: progress.inProgress, label: 'in progress'},
    {key: 'empty', value: progress.empty, label: 'not started'},
  ].filter(part => part.value);
  return (
    <VStack gap={2}>
      <div className="review-bar" aria-hidden="true">
        {parts.map(part => (
          <span key={part.key} data-part={part.key} style={{flexGrow: part.value}} />
        ))}
      </div>
      <Text type="supporting" color="secondary">
        {parts.map(part => `${part.value} ${part.label}`).join(' · ')}
      </Text>
    </VStack>
  );
}
