'use client';

import {useRef, useState, useTransition} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {IconButton} from '@astryxdesign/core/IconButton';
import {TextInput} from '@astryxdesign/core/TextInput';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Selector} from '@astryxdesign/core/Selector';
import {Banner} from '@astryxdesign/core/Banner';
import {Icon} from '@astryxdesign/core/Icon';
import {ArrowDown, ArrowLeft, ArrowUp, Check, Plus, RotateCcw, Trash2} from 'lucide-react';
import {
  SETUP_LIMITS,
  SETUP_STEPS,
  documentNoun,
  documentTypeOf,
  getTemplate,
  outlineFor,
  outlineId,
  projectTypeFor,
  type DocumentTemplate,
  type MetadataField,
  type SetupStep,
  type StudioSetup,
} from '@studio/shared';
import {duplicateStudioCaseStudy, saveProjectSetup} from '@/app/studio/document-actions';
import {MediaProvider} from '@/components/editor/MediaLibrary';
import {ImageField} from '@/components/editor/SettingsPanel';
import {TemplateGallery} from './TemplateGallery';

const STEP_NAMES: Record<SetupStep, string> = {
  start: 'Template',
  details: 'Details',
  cover: 'Cover picture',
  outline: 'Outline',
};

/** One of the user's own documents that can be copied (step 1, "Copy one of your documents"). */
export type CopySource = {id: string; title: string};

/**
 * Create Document (multi-vertical Phase 2; it grew out of the Stage 1 project setup). Four steps:
 * choose a template from the library (or blank, or a copy of one of your own documents), its
 * details, an optional cover, the outline. Only the working title is required; the user can go
 * back to any step, save and finish later, or start writing at any point. The questions on the
 * details step come from the chosen template, so a new template needs no change here. Nothing is
 * created until they choose Create (or Save and finish later); creating is a server action (POST).
 */
export function ProjectSetup({id, initial, copySources}: {id?: string; initial: StudioSetup; copySources: CopySource[]}) {
  const [setup, setSetup] = useState<StudioSetup>(initial);
  const [visited, setVisited] = useState<Set<SetupStep>>(() => new Set(SETUP_STEPS.slice(0, SETUP_STEPS.indexOf(initial.step) + 1)));
  const [copyFrom, setCopyFrom] = useState(copySources[0]?.id ?? '');
  const [copyTitle, setCopyTitle] = useState('');
  const [titleError, setTitleError] = useState('');
  const [error, setError] = useState('');
  const [isSaving, startSaving] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const step = setup.step;
  const index = SETUP_STEPS.indexOf(step);
  const update = (patch: Partial<StudioSetup>) => setSetup(current => ({...current, ...patch}));

  const goTo = (next: SetupStep) => {
    setError('');
    setSetup(current => ({...current, step: next}));
    setVisited(current => new Set(current).add(next));
    // Move focus to the new step's heading, so keyboard and screen-reader users land on it.
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  /** Choosing a template sets the kind of document and replaces the outline with its sections. */
  const chooseTemplate = (template: DocumentTemplate) => {
    if (template.id === setup.template_id && template.version === setup.template_version) return;
    update({
      template_id: template.id,
      template_version: template.version,
      document_type: documentTypeOf(template, setup.document_type),
      project_type: projectTypeFor(template),
      outline: outlineFor(template),
      start: template.sections.length ? 'framework' : 'blank',
    });
  };

  const save = (finish: boolean) => {
    setError('');
    startSaving(async () => {
      const result = await saveProjectSetup(setup, {id, finish});
      if (result && !result.ok) setError(result.error);
    });
  };

  const next = () => {
    if (step === 'details' && !setup.title.trim()) {
      setTitleError('Enter a working title. You can change it at any time.');
      // The title is the first field: take the user straight to it.
      document.querySelector<HTMLInputElement>('.setup-panel input')?.focus();
      return;
    }
    setTitleError('');
    goTo(SETUP_STEPS[index + 1]);
  };

  const framework = getTemplate(setup.template_id, setup.template_version);
  const noun = documentNoun(setup.document_type);
  const isLast = step === 'outline';
  const canSkip = step === 'cover';

  return (
    <MediaProvider caseStudyId={null}>
      <div className="setup">
        {/* Steps: a list on wide screens ("Step 2 of 6" on phones). Visited steps are links back. */}
        <nav aria-label="Setup steps" className="setup-nav">
          <Text type="supporting" color="secondary" className="only-narrow">
            Step {index + 1} of {SETUP_STEPS.length}: {STEP_NAMES[step]}
          </Text>
          <ol className="setup-steps only-wide">
            {SETUP_STEPS.map((name, position) => {
              const isCurrent = name === step;
              const isDone = visited.has(name) && position < index;
              return (
                <li key={name}>
                  <button
                    type="button"
                    className="setup-step"
                    aria-current={isCurrent ? 'step' : undefined}
                    disabled={!visited.has(name) || isCurrent}
                    onClick={() => goTo(name)}>
                    <span className="setup-step-number t-web-label-md-semibold" aria-hidden="true">
                      {isDone ? <Icon icon={Check} size="sm" color="inherit" /> : position + 1}
                    </span>
                    <span className="t-web-label-xl-medium">{STEP_NAMES[name]}</span>
                    {isDone && <span className="sr-only"> (done)</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <VStack gap={6} className="setup-panel">
          <VStack gap={2}>
            <Heading level={2} ref={headingRef} tabIndex={-1} className="setup-heading">
              {HEADINGS[step](noun)}
            </Heading>
            <Text color="secondary">{INTROS[step](noun)}</Text>
          </VStack>

          {error && <Banner status="error" title={error} collapsible={false} />}

          {step === 'start' && (
            <>
              <TemplateGallery value={`${setup.template_id}@${setup.template_version}`} onChoose={chooseTemplate} />
              {copySources.length > 0 && (
                <VStack gap={4} className="setup-subpanel" role="group" aria-label="Copy one of your documents">
                  <VStack gap={1}>
                    <Heading level={3}>Or copy one of your documents</Heading>
                    <Text type="supporting" color="secondary">
                      The copy is a new private draft with the same sections and content. The original stays as it is.
                    </Text>
                  </VStack>
                  <Selector label="Document to copy" options={copySources.map(source => ({value: source.id, label: source.title}))} value={copyFrom} onChange={setCopyFrom} width="100%" />
                  <TextInput label="Title of the copy" description="Leave it empty to use “Copy of” and the original title." value={copyTitle} onChange={setCopyTitle} width="100%" />
                  <HStack>
                    <Button
                      label="Make a copy"
                      variant="secondary"
                      isLoading={isSaving}
                      isDisabled={!copyFrom}
                      onClick={() =>
                        startSaving(async () => {
                          const result = await duplicateStudioCaseStudy(copyFrom, copyTitle);
                          if (result && !result.ok) setError(result.error);
                        })
                      }
                    />
                  </HStack>
                </VStack>
              )}
            </>
          )}

          {step === 'details' && <Details setup={setup} template={framework} update={update} titleError={titleError} />}

          {step === 'cover' && (
            <VStack gap={4} className="setup-cover">
              <ImageField label="Cover picture" url={setup.cover_path} onChange={(path, alt) => update({cover_path: path, cover_alt: path ? (alt ?? setup.cover_alt) : ''})} />
              {setup.cover_path && (
                <TextInput
                  label="Alt text"
                  description="Describe what the picture shows, for people who can’t see it."
                  value={setup.cover_alt}
                  onChange={value => update({cover_alt: value.slice(0, SETUP_LIMITS.coverAlt)})}
                  width="100%"
                />
              )}
            </VStack>
          )}

          {step === 'outline' && <OutlineEditor setup={setup} framework={framework} update={update} />}

          {/* Actions: Back on the left; Save and finish later, Skip and Continue (or Create) on the right. */}
          <HStack justify="between" gap={3} wrap="wrap" className="setup-actions">
            <HStack gap={2}>
              {index > 0 && <Button label="Back" variant="ghost" onClick={() => goTo(SETUP_STEPS[index - 1])} icon={<Icon icon={ArrowLeft} size="sm" color="inherit" />} />}
            </HStack>
            <HStack gap={2} wrap="wrap" hAlign="end">
              {index > 0 && <Button label="Save and finish later" variant="ghost" isDisabled={isSaving} onClick={() => save(false)} />}
              {canSkip && <Button label="Skip this step" variant="ghost" onClick={() => goTo(SETUP_STEPS[index + 1])} />}
              {isLast ? <Button label={`Create ${noun}`} variant="primary" isLoading={isSaving} onClick={() => save(true)} /> : <Button label="Continue" variant="primary" onClick={next} />}
            </HStack>
          </HStack>
          {!isLast && (
            <Text type="supporting" color="secondary">
              Want to write straight away?{' '}
              <button type="button" className="setup-text-button" disabled={isSaving} onClick={() => save(true)}>
                Skip the rest and start writing
              </button>
              . You can change everything later.
            </Text>
          )}
        </VStack>
      </div>
    </MediaProvider>
  );
}

const HEADINGS: Record<SetupStep, (noun: string) => string> = {
  start: () => 'What are you creating?',
  details: noun => `Tell us about the ${noun}`,
  cover: () => 'Add a cover picture',
  outline: () => 'Review your outline',
};

const INTROS: Record<SetupStep, (noun: string) => string> = {
  start: () => 'Choose a template to start from. It suggests sections and the questions each one answers; you can change all of it later.',
  details: () => 'Only the working title is needed now. Everything else is optional, and you can fill it in later.',
  cover: noun => `Optional. The picture at the top of your ${noun}, also used on its card. Choose one from your media library or upload one.`,
  outline: noun => `These are the sections your ${noun} starts with. Rename, reorder, add or remove them. You can change them in the editor too.`,
};

/** The columns a template field can be stored in (every other field goes in `metadata`). */
type ColumnKey = 'role' | 'team' | 'timeline' | 'platform' | 'objective' | 'challenge';

/** The working title and overview, then the template's own questions (its `metadataFields`). */
function Details({setup, template, update, titleError}: {setup: StudioSetup; template: DocumentTemplate | undefined; update: (patch: Partial<StudioSetup>) => void; titleError: string}) {
  const fields = template?.metadataFields ?? [];
  const valueOf = (field: MetadataField) => (field.storage === 'column' ? setup[field.key as ColumnKey] ?? '' : setup.metadata[field.key] ?? '');
  const set = (field: MetadataField, value: string) => {
    const text = value.slice(0, field.max);
    update(field.storage === 'column' ? {[field.key as ColumnKey]: text} : {metadata: {...setup.metadata, [field.key]: text}});
  };
  const short = fields.filter(field => field.kind === 'text');
  const long = fields.filter(field => field.kind === 'longtext');
  return (
    <VStack gap={6}>
      <VStack gap={4}>
        <TextInput
          label="Working title"
          value={setup.title}
          onChange={value => update({title: value.slice(0, SETUP_LIMITS.title)})}
          width="100%"
          isRequired
          hasAutoFocus
          status={titleError ? {type: 'error', message: titleError} : undefined}
        />
        <TextArea label="Overview" description="What it is about, in two or three sentences." value={setup.summary} onChange={value => update({summary: value.slice(0, SETUP_LIMITS.summary)})} rows={3} width="100%" isOptional />
      </VStack>
      {short.length > 0 && (
        <div className="setup-fields">
          {short.map(field => (
            <TextInput key={field.key} label={field.label} description={field.description} value={valueOf(field)} onChange={value => set(field, value)} width="100%" isOptional />
          ))}
        </div>
      )}
      {long.length > 0 && (
        <VStack gap={4}>
          {long.map(field => (
            <TextArea key={field.key} label={field.label} description={field.description} value={valueOf(field)} onChange={value => set(field, value)} rows={2} width="100%" isOptional />
          ))}
        </VStack>
      )}
    </VStack>
  );
}

function OutlineEditor({setup, framework, update}: {setup: StudioSetup; framework: DocumentTemplate | undefined; update: (patch: Partial<StudioSetup>) => void}) {
  const outline = setup.outline;
  const [announcement, setAnnouncement] = useState('');
  const set = (next: StudioSetup['outline']) => update({outline: next});
  const move = (from: number, to: number) => {
    const next = [...outline];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    set(next);
    setAnnouncement(`${item.title || 'Section'} moved to position ${to + 1} of ${next.length}.`);
  };
  const purposeOf = (key: string | null) => framework?.sections.find(section => section.key === key)?.purpose;
  const isFull = outline.length >= SETUP_LIMITS.sections;

  return (
    <VStack gap={4}>
      {outline.length ? (
        <ol className="setup-outline">
          {outline.map((item, position) => {
            const name = item.title.trim() || `Section ${position + 1}`;
            return (
              <li key={item.id} className="setup-outline-row">
                <span className="setup-outline-number t-web-label-md-semibold" aria-hidden="true">
                  {position + 1}
                </span>
                <VStack gap={1} className="setup-outline-field">
                  <TextInput
                    label={`Section ${position + 1} title`}
                    isLabelHidden
                    value={item.title}
                    placeholder="Section title"
                    onChange={value => set(outline.map(row => (row.id === item.id ? {...row, title: value.slice(0, SETUP_LIMITS.sectionTitle)} : row)))}
                    width="100%"
                    size="sm"
                  />
                  <Text type="supporting" color="secondary">
                    {purposeOf(item.key) ?? 'Your own section.'}
                  </Text>
                </VStack>
                <HStack gap={1} className="setup-outline-actions">
                  <IconButton label={`Move ${name} up`} tooltip="Move up" size="sm" variant="ghost" isDisabled={position === 0} onClick={() => move(position, position - 1)} icon={<Icon icon={ArrowUp} size="sm" color="inherit" />} />
                  <IconButton label={`Move ${name} down`} tooltip="Move down" size="sm" variant="ghost" isDisabled={position === outline.length - 1} onClick={() => move(position, position + 1)} icon={<Icon icon={ArrowDown} size="sm" color="inherit" />} />
                  <IconButton
                    label={`Remove ${name}`}
                    tooltip="Remove"
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      set(outline.filter(row => row.id !== item.id));
                      setAnnouncement(`${name} removed.`);
                    }}
                    icon={<Icon icon={Trash2} size="sm" color="inherit" />}
                  />
                </HStack>
              </li>
            );
          })}
        </ol>
      ) : (
        <Text color="secondary" className="setup-outline-empty">
          No sections yet. Add one, or create the document and add sections as you write.
        </Text>
      )}
      <HStack gap={2} wrap="wrap">
        <Button
          label="Add section"
          variant="secondary"
          isDisabled={isFull}
          onClick={() => {
            set([...outline, {id: outlineId(), key: null, title: ''}]);
            setAnnouncement('Section added at the end.');
            // Straight into naming it.
            requestAnimationFrame(() => [...document.querySelectorAll<HTMLInputElement>('.setup-outline input')].at(-1)?.focus());
          }}
          icon={<Icon icon={Plus} size="sm" color="inherit" />}
        />
        {framework && framework.sections.length > 0 && (
          <Button label="Reset to the template’s sections" variant="ghost" onClick={() => set(outlineFor(framework))} icon={<Icon icon={RotateCcw} size="sm" color="inherit" />} />
        )}
      </HStack>
      {isFull && <Text type="supporting" color="secondary">An outline can have up to {SETUP_LIMITS.sections} sections.</Text>}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </VStack>
  );
}
