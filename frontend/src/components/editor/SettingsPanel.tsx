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
import {slugify, studioMediaUrl, type StudioMeta} from '@studio/shared';
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
function ImageField({
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
}: {
  meta: StudioMeta;
  onChange: (patch: Partial<StudioMeta>) => void;
}) {
  const [tags, setTags] = useState(meta.tags.join(', '));
  const [isSlugEdited, setIsSlugEdited] = useState(!meta.slug.startsWith('untitled-'));

  return (
    <VStack gap={8} className="write-settings">
      <Heading level={2} style={{fontSize: 'var(--type-headline-s-size)'}}>
        Case study settings
      </Heading>

      <Group title="Thumbnail" hint="The picture that stands for this case study in your workspace.">
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
          description="Describe the picture for screen readers."
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

      <Group title="Headline">
        <TextInput
          label="Headline"
          description="Wrap one word in *asterisks* to set it in the accent face."
          value={meta.title}
          onChange={value => {
            onChange(isSlugEdited ? {title: value} : {title: value, slug: slugify(value)});
          }}
          width="100%"
        />
        <TextInput label="Subheadline" value={meta.subtitle} onChange={value => onChange({subtitle: value})} width="100%" />
        <TextArea
          label="Summary"
          description="Two or three sentences about the project."
          value={meta.summary}
          onChange={value => onChange({summary: value})}
          rows={4}
          width="100%"
        />
      </Group>

      <Divider />

      <Group title="Details">
        <TextInput label="Project label" description="e.g. Client × Product" value={meta.label} onChange={value => onChange({label: value})} width="100%" />
        <TextInput label="Area" description="e.g. Health and wellness" value={meta.area} onChange={value => onChange({area: value})} width="100%" />
        <TextInput
          label="Tags"
          description="Comma-separated, e.g. Mobile app, UX/UI, 2025"
          value={tags}
          onChange={value => {
            setTags(value);
            onChange({tags: value.split(',').map(tag => tag.trim()).filter(Boolean)});
          }}
          width="100%"
        />
        <TextInput label="Focus" description="e.g. Onboarding · Mobile experience" value={meta.focus} onChange={value => onChange({focus: value})} width="100%" />
      </Group>

      <Divider />

      <Group title="Opening visual" hint="The large picture at the top of the case study (optional).">
        <ImageField label="Cover" url={meta.cover_path} onChange={path => onChange({cover_path: path})} />
      </Group>

      <Divider />

      <Group title="Short name">
        <TextInput
          label="Short name"
          description="Lowercase letters, numbers and dashes. Unique in your workspace; never public."
          value={meta.slug}
          onChange={value => {
            setIsSlugEdited(true);
            onChange({slug: slugify(value)});
          }}
          width="100%"
        />
      </Group>
    </VStack>
  );
}
