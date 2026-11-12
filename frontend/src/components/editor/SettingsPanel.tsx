'use client';

import {useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Selector} from '@astryxdesign/core/Selector';
import {Button} from '@astryxdesign/core/Button';
import {Divider} from '@astryxdesign/core/Divider';
import {Icon} from '@astryxdesign/core/Icon';
import {ImageUp, Trash2} from 'lucide-react';
import {PROJECT_TYPES, slugify, studioMediaUrl, type ProjectType, type StudioMeta} from '@studio/shared';
import {useMedia} from './MediaLibrary';
import {EYEBROW_STYLE} from '@/theme/eyebrow';

const FOCUS = [
  {value: 'center', label: 'Centre'},
  {value: 'top', label: 'Top'},
  {value: 'bottom', label: 'Bottom'},
  {value: 'left center', label: 'Left'},
  {value: 'right center', label: 'Right'},
];

function Group({title, hint, children}: {title: string; hint?: string; children: React.ReactNode}) {
  return (
    <VStack gap={4}>
      <VStack gap={1}>
        <Text type="supporting" style={EYEBROW_STYLE}>
          {title}
        </Text>
        {hint && (
          <Text type="supporting" color="secondary">
            {hint}
          </Text>
        )}
      </VStack>
      {children}
    </VStack>
  );
}

/** An image field: shows the picture, chooses one from the media library (or uploads), or clears it. */
export function ImageField({
  label,
  url,
  focus,
  onChange,
}: {
  label: string;
  /** The stored image's path. */
  url: string | null;
  focus?: string;
  onChange: (path: string | null, alt?: string) => void;
}) {
  const media = useMedia();
  const choose = async () => {
    const asset = await media.pick('image');
    if (asset) onChange(asset.path, asset.alt);
  };
  const chooseButton = (
    <Button
      label={url ? `Replace ${label.toLowerCase()}` : `Choose ${label.toLowerCase()}`}
      variant="secondary"
      size="sm"
      onClick={choose}
      icon={<Icon icon={ImageUp} size="sm" color="inherit" />}
    />
  );
  // The actions live inside the frame: under the empty-state text, or over the picture's foot.
  return url ? (
    <div className="write-image-frame">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={studioMediaUrl(url)} alt="" className="write-image-field" style={{objectPosition: focus ?? 'center'}} />
      <HStack gap={2} className="write-image-actions">
        {chooseButton}
        <Button
          label="Remove"
          variant="destructive"
          size="sm"
          onClick={() => onChange(null)}
          icon={<Icon icon={Trash2} size="sm" color="inherit" />}
        />
      </HStack>
    </div>
  ) : (
    <VStack className="write-image-field write-image-empty" gap={3} hAlign="center" vAlign="center">
      <Text type="supporting" color="secondary">
        No {label.toLowerCase()} yet
      </Text>
      {chooseButton}
    </VStack>
  );
}

/**
 * Everything besides the story itself: the thumbnail, headline, details, the
 * opening visual and the short name. All private to the workspace.
 */
export function SettingsPanel({
  meta,
  onChange,
  isCaseStudy = true,
  template,
}: {
  meta: StudioMeta;
  onChange: (patch: Partial<StudioMeta>) => void;
  /** UX case studies have a project type; other kinds of document don't. */
  isCaseStudy?: boolean;
  /** The template the document was made with, and the way to update it (shown first). */
  template?: React.ReactNode;
}) {
  const [tags, setTags] = useState(meta.tags.join(', '));

  return (
    <VStack gap={8} className="write-settings">
      <Heading level={2} style={{fontSize: 'var(--type-headline-s-size)'}}>
        Details
      </Heading>

      {template && <Group title="Template">{template}</Group>}

      <Group title="Thumbnail" hint="The picture on this document’s card in My documents.">
        <ImageField
          label="Thumbnail"
          url={meta.thumbnail_path}
          focus={meta.thumbnail_focus}
          onChange={(path, alt) =>
            onChange(path && alt && !meta.thumbnail_alt ? {thumbnail_path: path, thumbnail_alt: alt} : {thumbnail_path: path})
          }
        />
        <TextInput
          label="Alt text"
          description="Describe what the picture shows, for people who can’t see it."
          value={meta.thumbnail_alt}
          onChange={value => onChange({thumbnail_alt: value})}
          width="100%"
        />
        <Selector
          label="Keep in view when cropped"
          options={FOCUS}
          value={meta.thumbnail_focus}
          onChange={value => onChange({thumbnail_focus: value})}
        />
      </Group>

      <Divider />

      <Group title="Summary" hint="The title and subtitle are on the page, above the first section.">
        <TextArea
          label="Summary"
          description="Two or three sentences about it."
          value={meta.summary}
          onChange={value => onChange({summary: value})}
          rows={4}
          width="100%"
        />
      </Group>

      <Divider />

      <Group title="Details">
        <TextInput label="Project label" description="For example: Client × Product" value={meta.label} onChange={value => onChange({label: value})} width="100%" />
        <TextInput label="Area" description="For example: Health and wellness" value={meta.area} onChange={value => onChange({area: value})} width="100%" />
        <TextInput
          label="Tags"
          description="Separate tags with commas. For example: Mobile app, UX/UI, 2025"
          value={tags}
          onChange={value => {
            setTags(value);
            onChange({tags: value.split(',').map(tag => tag.trim()).filter(Boolean)});
          }}
          width="100%"
        />
        <TextInput label="Focus" description="For example: Onboarding · Mobile experience" value={meta.focus} onChange={value => onChange({focus: value})} width="100%" />
      </Group>

      <Divider />

      {/* The UX case-study details (their own columns). Other templates' details arrive with those templates. */}
      {isCaseStudy && (
        <>
          <Group title="Project" hint="From setup. All optional.">
            <Selector
              label="Project type"
              options={[{value: '', label: 'Not set'}, ...Object.entries(PROJECT_TYPES).map(([value, type]) => ({value, label: type.label}))]}
              value={meta.project_type ?? ''}
              onChange={value => onChange({project_type: (value || null) as ProjectType | null})}
            />
            <TextInput label="Your role" description="For example: Lead product designer" value={meta.role} onChange={value => onChange({role: value})} width="100%" />
            <TextInput label="Team" description="Who you worked with." value={meta.team} onChange={value => onChange({team: value})} width="100%" />
            <TextInput label="Timeline" description="For example: March to June 2025" value={meta.timeline} onChange={value => onChange({timeline: value})} width="100%" />
            <TextInput label="Platform" description="For example: iOS and Android app" value={meta.platform} onChange={value => onChange({platform: value})} width="100%" />
            <TextArea label="Objective" description="What the project set out to achieve." value={meta.objective} onChange={value => onChange({objective: value})} rows={2} width="100%" />
            <TextArea label="Main challenge" description="The biggest problem you had to solve." value={meta.challenge} onChange={value => onChange({challenge: value})} rows={2} width="100%" />
          </Group>
        </>
      )}

      <Divider />

      <Group title="Opening visual" hint="Optional. The large picture at the top of the document.">
        <ImageField label="Cover" url={meta.cover_path} onChange={path => onChange({cover_path: path})} />
      </Group>

      <Divider />

      <Group title="Short name">
        <TextInput
          label="Short name"
          description="Used in this document’s private web address. Use lowercase letters, numbers and dashes, and a different name for each case study."
          value={meta.slug}
          onChange={value => {
            onChange({slug: slugify(value)});
          }}
          width="100%"
        />
      </Group>
    </VStack>
  );
}
