'use client';

import {useEffect, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {TextInput} from '@astryxdesign/core/TextInput';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Icon} from '@astryxdesign/core/Icon';
import {FileText, Film, Plus, Upload} from 'lucide-react';
import {studioMediaUrl, type StudioAsset} from '@studio/shared';
import {formatBytes} from '@/lib/caseStudies/embeds';
import {STUDIO_ACCEPT_BY_KIND, listStudioMedia, uploadStudioAsset} from '@/lib/storage/studio-storage';
import {pickFile, type MediaKind} from './upload';

/** The drag type a media item carries, so the editor can drop it in place. */
export const ASSET_DRAG_TYPE = 'application/x-studio-asset';

const KINDS: {value: MediaKind; label: string}[] = [
  {value: 'image', label: 'Images'},
  {value: 'video', label: 'Videos'},
  {value: 'file', label: 'Files'},
];

/**
 * Media (Region C, "Media" tab): the user's own uploads beside the story. Insert puts the file at
 * the cursor; dragging one onto the page drops it where it lands. Uploading here adds it to this
 * case study's folder and the library. Private files only, shown through /studio/files.
 */
export function MediaPanel({caseStudyId, isEditable, onInsert}: {caseStudyId: string; isEditable: boolean; onInsert: (asset: StudioAsset) => void}) {
  const [kind, setKind] = useState<MediaKind>('image');
  const [assets, setAssets] = useState<StudioAsset[] | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    listStudioMedia(kind)
      .then(list => {
        if (!isCancelled) {
          setAssets(list);
          setError('');
        }
      })
      .catch(listError => !isCancelled && setError(listError instanceof Error ? listError.message : 'We couldn’t load your files. Try again.'));
    return () => {
      isCancelled = true;
    };
  }, [kind, reload]);

  const upload = async () => {
    const file = await pickFile(STUDIO_ACCEPT_BY_KIND[kind]);
    if (!file) return;
    setIsUploading(true);
    try {
      const asset = await uploadStudioAsset(file, caseStudyId);
      setReload(count => count + 1);
      onInsert(asset);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'The upload didn’t finish. Check your connection and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const needle = query.trim().toLowerCase();
  const shown = (assets ?? []).filter(asset => `${asset.original_name} ${asset.alt}`.toLowerCase().includes(needle));
  const kindLabel = KINDS.find(item => item.value === kind)!.label.toLowerCase();

  return (
    <VStack gap={4} className="write-media">
      <HStack justify="between" vAlign="center" gap={2}>
        <Text weight="semibold">Your media</Text>
        <Button label="Upload" variant="secondary" size="sm" isLoading={isUploading} isDisabled={!isEditable} onClick={upload} icon={<Icon icon={Upload} size="sm" color="inherit" />} />
      </HStack>
      <SegmentedControl label="Kind of media" value={kind} onChange={value => setKind(value as MediaKind)} size="sm" layout="fill">
        {KINDS.map(item => (
          <SegmentedControlItem key={item.value} value={item.value} label={item.label} />
        ))}
      </SegmentedControl>
      <TextInput label="Search your media" isLabelHidden placeholder="Search by name or alt text" value={query} onChange={setQuery} width="100%" size="sm" />
      {error && (
        <Text role="alert" color="secondary">
          {error}
        </Text>
      )}
      {assets === null ? (
        <Text color="secondary">Loading…</Text>
      ) : shown.length === 0 ? (
        <Text color="secondary">{needle ? `No ${kindLabel} match “${query.trim()}”.` : `No ${kindLabel} yet. Select Upload to add one.`}</Text>
      ) : (
        <>
          <Text type="supporting" color="secondary">
            Select Insert to add one at the cursor, or drag it onto the page.
          </Text>
          <ul className="write-media-list" aria-label={`Your ${kindLabel}`}>
            {shown.map(asset => (
              <li
                key={asset.id}
                className="write-media-item"
                draggable={isEditable}
                onDragStart={event => {
                  event.dataTransfer.effectAllowed = 'copy';
                  event.dataTransfer.setData(ASSET_DRAG_TYPE, JSON.stringify(asset));
                }}>
                <span className="write-media-thumb" aria-hidden="true">
                  {asset.kind === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={studioMediaUrl(asset.path)} alt="" loading="lazy" draggable={false} />
                  ) : (
                    <Icon icon={asset.kind === 'video' ? Film : FileText} size="md" color="inherit" />
                  )}
                </span>
                <VStack gap={0} className="write-media-text">
                  <Text type="supporting" maxLines={1}>
                    {asset.original_name}
                  </Text>
                  <Text type="supporting" color="secondary" maxLines={1}>
                    {[asset.width && asset.height ? `${asset.width}×${asset.height}` : '', formatBytes(asset.size), asset.kind === 'image' && !asset.alt ? 'No alt text' : '']
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </VStack>
                <Button
                  label="Insert"
                  aria-label={`Insert ${asset.original_name}`}
                  variant="ghost"
                  size="sm"
                  isDisabled={!isEditable}
                  onClick={() => onInsert(asset)}
                  icon={<Icon icon={Plus} size="sm" color="inherit" />}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </VStack>
  );
}
