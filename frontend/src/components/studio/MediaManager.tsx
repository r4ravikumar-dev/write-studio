'use client';

import {useState, useTransition} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {TextArea} from '@astryxdesign/core/TextArea';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Icon} from '@astryxdesign/core/Icon';
import {FileText, Trash2, Upload} from 'lucide-react';
import type {StudioAsset} from '@studio/shared';
import {formatBytes} from '@/lib/caseStudies/embeds';
import {studioMediaUrl} from '@studio/shared';
import {STUDIO_ACCEPT, removeStudioAsset, saveStudioAlt, uploadStudioAsset} from '@/lib/storage/studio-storage';

function pickFiles(): Promise<File[]> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = STUDIO_ACCEPT;
    input.multiple = true;
    input.onchange = () => resolve([...(input.files ?? [])]);
    input.oncancel = () => resolve([]);
    input.click();
  });
}

/** One upload: its preview (from the private, session-checked URL), alt text and Delete. */
function MediaItem({asset, onDelete}: {asset: StudioAsset; onDelete: () => void}) {
  const [alt, setAlt] = useState(asset.alt);
  const [saved, setSaved] = useState(asset.alt);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const src = studioMediaUrl(asset.path);

  const save = async () => {
    if (alt.trim() === saved.trim()) return;
    setStatus('saving');
    try {
      await saveStudioAlt(asset.id, alt);
      setSaved(alt);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  };

  return (
    <VStack gap={3} className="studio-media-item">
      {asset.kind === 'image' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="studio-media-image" src={src} alt={alt || asset.original_name} width={asset.width ?? undefined} height={asset.height ?? undefined} loading="lazy" />
      ) : asset.kind === 'video' ? (
        <video className="studio-media-image" src={src} controls preload="metadata" />
      ) : (
        <HStack gap={2} vAlign="center" className="studio-media-file">
          <Icon icon={FileText} size="md" color="inherit" />
          <a href={src} target="_blank" rel="noreferrer">
            {asset.original_name || 'File'}
          </a>
        </HStack>
      )}
      <Text type="supporting" color="secondary">
        {[asset.original_name, formatBytes(asset.size), asset.width && asset.height ? `${asset.width}×${asset.height}` : '']
          .filter(Boolean)
          .join(' · ')}
      </Text>
      {asset.kind !== 'file' && (
        <TextArea
          label="Alt text"
          placeholder="Describe it for people who can’t see it."
          value={alt}
          onChange={value => {
            setAlt(value);
            setStatus('idle');
          }}
          onBlur={save}
          rows={2}
          maxLength={500}
          width="100%"
          isLoading={status === 'saving'}
          status={status === 'error' ? {type: 'error', message: 'Couldn’t save. Try again.'} : status === 'saved' ? {type: 'success', message: 'Saved'} : undefined}
          statusVariant="detached"
        />
      )}
      <HStack>
        <Button label="Delete" size="sm" variant="destructive" onClick={onDelete} icon={<Icon icon={Trash2} size="sm" color="inherit" />} />
      </HStack>
    </VStack>
  );
}

/** The Studio media library: every private upload in the workspace. */
export function MediaManager({assets: initial}: {assets: StudioAsset[]}) {
  const [assets, setAssets] = useState(initial);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [toDelete, setToDelete] = useState<StudioAsset | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const upload = async () => {
    const files = await pickFiles();
    if (!files.length) return;
    setIsUploading(true);
    setError('');
    const problems: string[] = [];
    for (const file of files) {
      try {
        const asset = await uploadStudioAsset(file);
        setAssets(current => [asset, ...current]);
      } catch (problem) {
        problems.push(problem instanceof Error ? problem.message : String(problem));
      }
    }
    setError(problems.join(' '));
    setIsUploading(false);
  };

  return (
    <VStack gap={8}>
      <HStack justify="between" vAlign="end" gap={6} wrap="wrap">
        <VStack gap={2}>
          <Heading level={1}>Media</Heading>
          <Text color="secondary" style={{maxInlineSize: '60ch'}}>
            Images, video and documents for your case studies. They’re private: only you can open them while signed in.
            Up to 50 MB each.
          </Text>
        </VStack>
        <Button label="Upload" variant="primary" isLoading={isUploading} onClick={upload} icon={<Icon icon={Upload} size="sm" color="inherit" />} />
      </HStack>

      {error && (
        <Text role="alert" color="secondary" className="studio-media-error">
          {error}
        </Text>
      )}

      {assets.length ? (
        <Grid columns={{minWidth: 240, max: 4}} gap={6}>
          {assets.map(asset => (
            <MediaItem key={asset.id} asset={asset} onDelete={() => setToDelete(asset)} />
          ))}
        </Grid>
      ) : (
        <VStack gap={3} className="studio-empty">
          <Heading level={2}>Nothing uploaded yet</Heading>
          <Text color="secondary">Upload screenshots, prototypes, videos or decks to use in your case studies.</Text>
        </VStack>
      )}

      <AlertDialog
        isOpen={toDelete !== null}
        onOpenChange={open => {
          if (!open) setToDelete(null);
        }}
        title="Delete this file?"
        description="It’s removed from your library and storage for good. Case studies that use it will show a gap."
        actionLabel="Delete"
        cancelLabel="Keep it"
        isActionLoading={isDeleting}
        onAction={() =>
          startDelete(async () => {
            if (!toDelete) return;
            try {
              await removeStudioAsset(toDelete.id);
              setAssets(current => current.filter(asset => asset.id !== toDelete.id));
            } catch (problem) {
              setError(problem instanceof Error ? problem.message : String(problem));
            }
            setToDelete(null);
          })
        }
      />
    </VStack>
  );
}
