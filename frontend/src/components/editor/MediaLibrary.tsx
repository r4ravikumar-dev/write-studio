'use client';

import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Grid} from '@astryxdesign/core/Grid';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {TextInput} from '@astryxdesign/core/TextInput';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Icon} from '@astryxdesign/core/Icon';
import {FileText, Film, Upload} from 'lucide-react';
import type {StudioAsset as Asset} from '@studio/shared';
import {studioMediaUrl} from '@studio/shared';
import {formatBytes} from '@/lib/caseStudies/embeds';
import {pickFile, type MediaKind} from './upload';
import {STUDIO_ACCEPT_BY_KIND, listStudioMedia, uploadStudioAsset} from '@/lib/storage/studio-storage';

type Picker = {
  /**
   * Opens the library for one kind, or several (tabs, e.g. image or video),
   * and resolves with the chosen (or newly uploaded) asset.
   */
  pick: (kinds: MediaKind | MediaKind[]) => Promise<Asset | null>;
  /** Uploads a file straight away (drag-and-drop, paste). */
  upload: (file: File) => Promise<Asset>;
};

const MediaContext = createContext<Picker | null>(null);

export function useMedia(): Picker {
  const picker = useContext(MediaContext);
  if (!picker) throw new Error('useMedia must be used inside <MediaProvider>');
  return picker;
}

const TITLES: Record<MediaKind, string> = {image: 'Images', video: 'Videos', file: 'Files'};

/**
 * The media library: every image, video and document the user uploaded, to
 * reuse in any block, plus Upload for something new. Private files only
 * (studio-private-media, the user's own). Provides useMedia() to the editor,
 * its blocks and the settings panel. New uploads go in this case study's folder.
 */
export function MediaProvider({caseStudyId, children}: {caseStudyId: string | null; children: React.ReactNode}) {
  const [kinds, setKinds] = useState<MediaKind[]>([]);
  const [kind, setKind] = useState<MediaKind | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const resolver = useRef<((asset: Asset | null) => void) | null>(null);

  useEffect(() => {
    if (!kind) return;
    let isCancelled = false;
    Promise.resolve().then(() => {
      if (!isCancelled) setIsLoading(true);
    });
    listStudioMedia(kind)
      .then(list => !isCancelled && setAssets(list))
      .catch(listError => !isCancelled && setError(listError instanceof Error ? listError.message : 'We couldn’t load your uploads. Close this window and try again.'))
      .finally(() => !isCancelled && setIsLoading(false));
    return () => {
      isCancelled = true;
    };
  }, [kind]);

  const close = (asset: Asset | null) => {
    resolver.current?.(asset);
    resolver.current = null;
    setKind(null);
    setKinds([]);
    setQuery('');
    setError('');
  };

  const pick = useCallback((next: MediaKind | MediaKind[]) => {
    resolver.current?.(null);
    const list = Array.isArray(next) ? next : [next];
    setKinds(list);
    setKind(list[0] ?? 'image');
    return new Promise<Asset | null>(resolve => {
      resolver.current = resolve;
    });
  }, []);

  const upload = useCallback((file: File) => uploadStudioAsset(file, caseStudyId), [caseStudyId]);

  const uploadNew = async () => {
    if (!kind) return;
    const file = await pickFile(STUDIO_ACCEPT_BY_KIND[kind]);
    if (!file) return;
    setIsUploading(true);
    try {
      close(await uploadStudioAsset(file, caseStudyId));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'The upload didn’t finish. Check your connection and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const shown = assets.filter(asset =>
    `${asset.original_name} ${asset.alt}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const value = useMemo(() => ({pick, upload}), [pick, upload]);

  return (
    <MediaContext.Provider value={value}>
      {children}
      <Dialog isOpen={kind !== null} onOpenChange={open => !open && close(null)} width={820} maxHeight="86dvh">
        <DialogHeader
          title={kind ? `Choose from ${TITLES[kind].toLowerCase()}` : 'Media'}
          subtitle="Everything you’ve uploaded, newest first."
          onOpenChange={open => !open && close(null)}
          endContent={
            <Button
              label="Upload a new file"
              variant="primary"
              size="sm"
              isLoading={isUploading}
              onClick={uploadNew}
              icon={<Icon icon={Upload} size="sm" color="inherit" />}
            />
          }
        />
        <VStack gap={4} className="media-library">
          {kinds.length > 1 && kind && (
            <SegmentedControl label="Kind of media" value={kind} onChange={value => setKind(value as MediaKind)} size="sm">
              {kinds.map(item => (
                <SegmentedControlItem key={item} value={item} label={TITLES[item]} />
              ))}
            </SegmentedControl>
          )}
          <TextInput
            label="Search uploads"
            isLabelHidden
            placeholder="Search by name or alt text"
            value={query}
            onChange={setQuery}
            width="100%"
          />
          {error && <Text color="secondary">{error}</Text>}
          {isLoading ? (
            <Text color="secondary">Loading…</Text>
          ) : shown.length === 0 ? (
            <VStack gap={2} hAlign="center" className="media-empty">
              <Text color="secondary">Nothing here yet. Select Upload a new file to add one.</Text>
            </VStack>
          ) : (
            <Grid columns={{minWidth: 150}} gap={3}>
              {shown.map(asset => (
                <button
                  key={asset.id}
                  type="button"
                  className="media-tile"
                  onClick={() => close(asset)}
                  aria-label={`Use ${asset.original_name}`}>
                  {asset.kind === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={studioMediaUrl(asset.path)} alt="" loading="lazy" />
                  ) : (
                    <HStack className="media-tile-icon" hAlign="center" vAlign="center">
                      <Icon icon={asset.kind === 'video' ? Film : FileText} size="lg" color="inherit" />
                    </HStack>
                  )}
                  <Text type="supporting" maxLines={1}>
                    {asset.original_name}
                  </Text>
                  <Text type="supporting" color="secondary">
                    {[asset.width && asset.height ? `${asset.width}×${asset.height}` : '', formatBytes(asset.size)]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </button>
              ))}
            </Grid>
          )}
        </VStack>
      </Dialog>
    </MediaContext.Provider>
  );
}
