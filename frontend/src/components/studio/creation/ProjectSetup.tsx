'use client';

import {useId, useRef, useState, useTransition} from 'react';
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
  FRAMEWORK_ACTS,
  PROJECT_TYPES,
  SETUP_LIMITS,
  SETUP_STEPS,
  getFramework,
  outlineFor,
  outlineId,
  recommendedFramework,
  setupFrameworks,
  type Framework,
  type FrameworkAct,
  type ProjectType,
  type SetupStep,
  type StudioSetup,
} from '@studio/shared';
import {duplicateStudioCaseStudy, saveProjectSetup} from '@/app/studio/case-study-actions';
import {MediaProvider} from '@/components/editor/MediaLibrary';
import {ImageField} from '@/components/editor/SettingsPanel';

const STEP_NAMES: Record<SetupStep, string> = {
  start: 'How to start',
  type: 'Project type',
  details: 'Project details',
  framework: 'Story framework',
  cover: 'Cover picture',
  outline: 'Outline',
};

/** A case study the user can copy (wizard step 1, "Copy a case study"). */
export type CopySource = {id: string; title: string};

type StartChoice = StudioSetup['start'] | 'copy';

/**
 * Project setup: the guided way to start a case study (Write Studio 2.0 blueprint in docs,
 * "Project Setup wizard"). Six steps, all skippable except the working title; the user can go
 * back to any step, save and finish later, or start writing at any point. Nothing is created
 * until they choose Create (or Save and finish later); creating is a server action (POST).
 */
export function ProjectSetup({id, initial, copySources}: {id?: string; initial: StudioSetup; copySources: CopySource[]}) {
  const [setup, setSetup] = useState<StudioSetup>(initial);
  const [visited, setVisited] = useState<Set<SetupStep>>(() => new Set(SETUP_STEPS.slice(0, SETUP_STEPS.indexOf(initial.step) + 1)));
  const [start, setStart] = useState<StartChoice>(initial.start);
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

  const chooseFramework = (framework: Framework) => {
    if (framework.id === setup.framework_id && framework.version === setup.framework_version) return;
    update({framework_id: framework.id, framework_version: framework.version, outline: outlineFor(framework), start: framework.id === 'blank' ? 'blank' : 'framework'});
  };

  const chooseStart = (choice: StartChoice) => {
    setStart(choice);
    if (choice === 'copy') return;
    update({start: choice});
    chooseFramework(choice === 'blank' ? getFramework('blank', 1)! : recommendedFramework(setup.project_type));
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

  const framework = getFramework(setup.framework_id, setup.framework_version);
  const isLast = step === 'outline';
  const isCopy = step === 'start' && start === 'copy';
  const canSkip = step === 'type' || step === 'cover';

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
                    disabled={!visited.has(name) || isCurrent || isCopy}
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
              {HEADINGS[step]}
            </Heading>
            <Text color="secondary">{INTROS[step]}</Text>
          </VStack>

          {error && <Banner status="error" title={error} collapsible={false} />}

          {step === 'start' && (
            <ChoiceGroup
              label="How to start"
              value={start}
              onChange={value => chooseStart(value as StartChoice)}
              options={[
                {value: 'framework', label: 'Use a story framework', description: 'Recommended. Suggested sections, each with questions to help you write.'},
                {value: 'blank', label: 'Start blank', description: 'An empty page. Add your own sections as you go.'},
                ...(copySources.length ? [{value: 'copy', label: 'Copy a case study', description: 'Start from one of your case studies and change what you need.'}] : []),
              ]}
            />
          )}
          {isCopy && (
            <VStack gap={4} className="setup-subpanel">
              <Selector label="Case study to copy" options={copySources.map(source => ({value: source.id, label: source.title}))} value={copyFrom} onChange={setCopyFrom} width="100%" />
              <TextInput label="Title of the copy" description="Leave it empty to use “Copy of” and the original title." value={copyTitle} onChange={setCopyTitle} width="100%" />
            </VStack>
          )}

          {step === 'type' && (
            <ChoiceGroup
              label="Project type"
              value={setup.project_type ?? ''}
              onChange={value => {
                const type = value as ProjectType;
                // Until the framework step has been seen, the framework follows the type's recommendation.
                const next = recommendedFramework(type);
                const follow = setup.start === 'framework' && !visited.has('framework') && !visited.has('outline');
                update({project_type: type, ...(follow ? {framework_id: next.id, framework_version: next.version, outline: outlineFor(next)} : {})});
              }}
              options={Object.entries(PROJECT_TYPES).map(([value, type]) => ({value, label: type.label, description: type.description}))}
            />
          )}

          {step === 'details' && <Details setup={setup} update={update} titleError={titleError} />}

          {step === 'framework' && <FrameworkStep setup={setup} chosen={framework} onChoose={chooseFramework} />}

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
              {isCopy ? (
                <Button
                  label="Make a copy"
                  variant="primary"
                  isLoading={isSaving}
                  isDisabled={!copyFrom}
                  onClick={() =>
                    startSaving(async () => {
                      const result = await duplicateStudioCaseStudy(copyFrom, copyTitle);
                      if (result && !result.ok) setError(result.error);
                    })
                  }
                />
              ) : (
                <>
                  {index > 0 && <Button label="Save and finish later" variant="ghost" isDisabled={isSaving} onClick={() => save(false)} />}
                  {canSkip && <Button label="Skip this step" variant="ghost" onClick={() => goTo(SETUP_STEPS[index + 1])} />}
                  {isLast ? (
                    <Button label="Create case study" variant="primary" isLoading={isSaving} onClick={() => save(true)} />
                  ) : (
                    <Button label="Continue" variant="primary" onClick={next} />
                  )}
                </>
              )}
            </HStack>
          </HStack>
          {!isLast && !isCopy && (
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

const HEADINGS: Record<SetupStep, string> = {
  start: 'How do you want to start?',
  type: 'What kind of project is it?',
  details: 'Tell us about the project',
  framework: 'Choose a story framework',
  cover: 'Add a cover picture',
  outline: 'Review your outline',
};

const INTROS: Record<SetupStep, string> = {
  start: 'You can change your mind later: everything here can be edited in the case study.',
  type: 'This helps us recommend a story framework.',
  details: 'Only the working title is needed now. Everything else is optional, and you can fill it in later.',
  framework: 'A framework suggests sections and the questions each one answers. You can rename, reorder, add and remove sections next.',
  cover: 'Optional. The picture at the top of your case study, also used on its card. Choose one from your media library or upload one.',
  outline: 'These are the sections your case study starts with. Rename, reorder, add or remove them. You can change them in the editor too.',
};

/** Radio buttons drawn as cards. Native inputs, so arrow keys and screen readers work as usual. */
function ChoiceGroup({label, value, onChange, options}: {label: string; value: string; onChange: (value: string) => void; options: {value: string; label: string; description: string; badge?: string}[]}) {
  const name = useId();
  return (
    <fieldset className="setup-choices">
      <legend className="sr-only">{label}</legend>
      {options.map(option => (
        <label key={option.value} className="setup-choice">
          <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} className="setup-choice-input" />
          <span className="setup-choice-text">
            <span className="setup-choice-label t-web-heading-sm">
              {option.label}
              {option.badge && <span className="setup-badge t-web-label-md-medium">{option.badge}</span>}
            </span>
            <span className="setup-choice-description t-web-body-lg-regular">{option.description}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function Details({setup, update, titleError}: {setup: StudioSetup; update: (patch: Partial<StudioSetup>) => void; titleError: string}) {
  const field = (key: 'role' | 'team' | 'timeline' | 'platform', label: string, description: string) => (
    <TextInput label={label} description={description} value={setup[key]} onChange={value => update({[key]: value.slice(0, SETUP_LIMITS[key])})} width="100%" isOptional />
  );
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
        <TextArea label="Overview" description="What the project is, in two or three sentences." value={setup.summary} onChange={value => update({summary: value.slice(0, SETUP_LIMITS.summary)})} rows={3} width="100%" isOptional />
      </VStack>
      <div className="setup-fields">
        {field('role', 'Your role', 'For example: Lead product designer')}
        {field('team', 'Team', 'Who you worked with. For example: 2 designers, 4 engineers, a product manager')}
        {field('timeline', 'Timeline', 'For example: March to June 2025')}
        {field('platform', 'Platform', 'For example: iOS and Android app')}
      </div>
      <VStack gap={4}>
        <TextArea label="Objective" description="What the project set out to achieve." value={setup.objective} onChange={value => update({objective: value.slice(0, SETUP_LIMITS.objective)})} rows={2} width="100%" isOptional />
        <TextArea label="Main challenge" description="The biggest problem you had to solve." value={setup.challenge} onChange={value => update({challenge: value.slice(0, SETUP_LIMITS.challenge)})} rows={2} width="100%" isOptional />
      </VStack>
    </VStack>
  );
}

function FrameworkStep({setup, chosen, onChoose}: {setup: StudioSetup; chosen: Framework | undefined; onChoose: (framework: Framework) => void}) {
  const frameworks = setupFrameworks();
  const recommended = recommendedFramework(setup.project_type);
  // Lower-case the first letter only, keeping acronyms ("UX research", "product redesign").
  const typeLabel = setup.project_type ? PROJECT_TYPES[setup.project_type].label.replace(/^([A-Z])(?=[a-z])/, letter => letter.toLowerCase()) : null;
  const acts = (Object.keys(FRAMEWORK_ACTS) as FrameworkAct[]).filter(act => chosen?.sections.some(section => section.act === act));
  return (
    <VStack gap={6}>
      <ChoiceGroup
        label="Story framework"
        value={chosen ? `${chosen.id}@${chosen.version}` : ''}
        onChange={value => {
          const framework = frameworks.find(candidate => `${candidate.id}@${candidate.version}` === value);
          if (framework) onChoose(framework);
        }}
        options={frameworks.map(framework => ({
          value: `${framework.id}@${framework.version}`,
          label: framework.name,
          description: framework.description,
          badge: framework === recommended ? (typeLabel ? `Recommended for ${typeLabel}` : 'Recommended') : undefined,
        }))}
      />
      {chosen && (
        <section className="setup-preview" aria-label={`Sections in ${chosen.name}`}>
          {chosen.sections.length ? (
            <VStack gap={5}>
              {/* The narrative flow: the acts in order. */}
              <ol className="setup-flow t-web-label-lg-medium" aria-label="Story flow">
                {acts.map(act => (
                  <li key={act}>{FRAMEWORK_ACTS[act]}</li>
                ))}
              </ol>
              <ol className="setup-preview-sections">
                {chosen.sections.map(section => (
                  <li key={section.key}>
                    <span className="setup-preview-title t-web-heading-sm">
                      {section.title}
                      {!section.required && <span className="setup-preview-optional t-web-body-lg-regular"> (optional)</span>}
                    </span>
                    <span className="setup-preview-purpose t-web-body-lg-regular">{section.purpose}</span>
                  </li>
                ))}
              </ol>
            </VStack>
          ) : (
            <Text color="secondary">You’ll start with an empty page. Add your own sections in the next step, or as you write.</Text>
          )}
        </section>
      )}
      {setup.outline.length > 0 && <Text type="supporting" color="secondary">Choosing a different framework replaces the outline with its sections.</Text>}
    </VStack>
  );
}

function OutlineEditor({setup, framework, update}: {setup: StudioSetup; framework: Framework | undefined; update: (patch: Partial<StudioSetup>) => void}) {
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
          No sections yet. Add one, or create the case study and add sections as you write.
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
          <Button label="Reset to the framework’s sections" variant="ghost" onClick={() => set(outlineFor(framework))} icon={<Icon icon={RotateCcw} size="sm" color="inherit" />} />
        )}
      </HStack>
      {isFull && <Text type="supporting" color="secondary">An outline can have up to {SETUP_LIMITS.sections} sections.</Text>}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </VStack>
  );
}
