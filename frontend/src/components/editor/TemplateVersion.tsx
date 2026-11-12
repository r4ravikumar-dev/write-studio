'use client';

import {useState, useTransition} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {DOCUMENT_TYPES, documentNoun, getTemplate, newerTemplate, templateChanges, type DocumentType, type TemplateSection} from '@studio/shared';
import {upgradeStudioDocumentTemplate} from '@/app/studio/document-actions';

/**
 * The template a document was made with, and the explicit way to move it to a newer version
 * (multi-vertical Phase 2, template immutability). A document stays on the version it was created
 * with until its owner chooses to update, after seeing exactly what would change. Updating changes
 * guidance only (what the guide, the review and Insert suggest): nothing written is touched, and
 * sections the new version adds are offered, not inserted.
 */
export function TemplateVersion({
  documentId,
  documentType,
  templateId,
  templateVersion,
  isReadOnly,
  beforeUpdate,
}: {
  documentId: string;
  documentType: DocumentType;
  templateId: string | null;
  templateVersion: number | null;
  isReadOnly: boolean;
  /** Saves pending edits first (the page reloads after an update). */
  beforeUpdate: () => Promise<{ok: boolean} | void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [isUpdating, startUpdate] = useTransition();
  const template = getTemplate(templateId, templateVersion);
  const newer = newerTemplate(template);
  const noun = documentNoun(documentType);
  const kind = DOCUMENT_TYPES[documentType]?.label ?? 'Document';

  if (!template) {
    return (
      <Text type="supporting" color="secondary">
        {kind}. This {noun} was made before templates had versions, so it follows the current guidance.
      </Text>
    );
  }

  const changes = newer ? templateChanges(template, newer) : null;
  const nothingStructural = changes && !changes.added.length && !changes.removed.length && !changes.requiredChanged.length;
  const titles = (sections: TemplateSection[]) => sections.map(section => section.title).join(', ');

  const update = () =>
    startUpdate(async () => {
      if (!newer) return;
      setError('');
      const saved = await beforeUpdate();
      if (saved && !saved.ok) {
        setError('Your latest changes couldn’t be saved, so the template wasn’t updated. Check your connection and try again.');
        return;
      }
      const result = await upgradeStudioDocumentTemplate(documentId, newer.version);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });

  return (
    <VStack gap={3}>
      <Text type="supporting" color="secondary">
        {kind} · {template.name}, version {template.version}
      </Text>
      {newer && (
        <VStack gap={2} className="template-update">
          <Text>
            Version {newer.version} of this template is available. Your {noun} stays on version {template.version} until you choose to update it.
          </Text>
          <HStack>
            <Button label="See what changes" variant="secondary" size="sm" isDisabled={isReadOnly} onClick={() => setIsOpen(true)} />
          </HStack>
          {isReadOnly && (
            <Text type="supporting" color="secondary">
              Restore this {noun} from the archive to update its template.
            </Text>
          )}
        </VStack>
      )}
      {newer && changes && (
        <Dialog isOpen={isOpen} onOpenChange={next => !next && setIsOpen(false)} width={560} maxHeight="88dvh">
          <DialogHeader title={`Update to version ${newer.version} of ${template.name}?`} onOpenChange={next => !next && setIsOpen(false)} />
          <VStack gap={5} className="template-update-dialog">
            <Text>
              Nothing you have written changes. Updating only changes the guidance: what the section guide, the review and Insert suggest.
            </Text>
            <dl className="template-facts">
              <div>
                <dt className="t-web-label-lg-medium">Sections in version {template.version}</dt>
                <dd className="t-web-body-lg-regular">{titles(template.sections) || 'None'}</dd>
              </div>
              <div>
                <dt className="t-web-label-lg-medium">Sections in version {newer.version}</dt>
                <dd className="t-web-body-lg-regular">{titles(newer.sections) || 'None'}</dd>
              </div>
            </dl>
            <ul className="template-update-list t-web-body-lg-regular">
              {nothingStructural && <li>The sections are the same, in the same order.</li>}
              {changes.added.length > 0 && <li>New suggested sections, offered in the outline but not added for you: {titles(changes.added)}.</li>}
              {changes.removed.length > 0 && <li>No longer suggested (any you have written stay in your {noun}): {titles(changes.removed)}.</li>}
              {changes.requiredChanged.length > 0 && <li>Now {changes.requiredChanged.some(section => section.required) ? 'expected' : 'optional'} in the review: {titles(changes.requiredChanged)}.</li>}
              {changes.recommendationsChanged.length > 0 && <li>Different recommended blocks in: {titles(changes.recommendationsChanged)}.</li>}
              {changes.guidanceChanged.length > 0 && <li>Reworded guidance in: {titles(changes.guidanceChanged)}.</li>}
            </ul>
            {error && <Text role="alert">{error}</Text>}
            <HStack gap={2} hAlign="end" wrap="wrap">
              <Button label={`Keep version ${template.version}`} variant="ghost" isDisabled={isUpdating} onClick={() => setIsOpen(false)} />
              <Button label={`Update to version ${newer.version}`} variant="primary" isLoading={isUpdating} onClick={update} />
            </HStack>
          </VStack>
        </Dialog>
      )}
    </VStack>
  );
}
