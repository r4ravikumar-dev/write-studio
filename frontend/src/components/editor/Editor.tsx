'use client';

import {useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import {EditorContent, useEditor, useEditorState, type Editor as TiptapEditor} from '@tiptap/react';
import {BubbleMenu} from '@tiptap/react/menus';
import {Placeholder} from '@tiptap/extensions';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Banner} from '@astryxdesign/core/Banner';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Icon} from '@astryxdesign/core/Icon';
import {Archive, ArchiveRestore, ArrowLeft, Bold, Eye, Italic, Link2, Monitor, PanelRight, Smartphone, Tablet, Underline} from 'lucide-react';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {caseStudyExtensions} from '@/components/caseStudy/schema';
import {parseEmbed} from '@/lib/caseStudies/embeds';
import {clearUntouchedHints, sectionOf} from '@studio/shared';
import type {StudioCaseStudy, StudioMeta, StudioStatus} from '@studio/shared';
import {archiveStudioCaseStudy, restoreStudioCaseStudy, saveStudioCaseStudy} from '@/app/studio/case-study-actions';
import {studioKindOfFile, uploadStudioAsset} from '@/lib/storage/studio-storage';
import {editorNodes} from './nodeViews';
import {Toolbar} from './Toolbar';
import {SlashMenu} from './SlashMenu';
import {SettingsPanel} from './SettingsPanel';
import {buildInsertCommands} from './insertCommands';
import type {MediaKind} from './upload';
import {MediaProvider, useMedia} from './MediaLibrary';
import {BlockInspector} from './BlockInspector';
import {findSelectedBlock} from './blockOps';
import type {StudioAsset as Asset} from '@studio/shared';
import {EYEBROW_STYLE} from '@/theme/eyebrow';

type SaveState = 'saved' | 'unsaved' | 'saving' | 'error';

/** How long typing pauses before an autosave. */
const AUTOSAVE_MS = 1200;

const CUSTOM_NODES = new Set(editorNodes.map(node => node.name));

const TIME = new Intl.DateTimeFormat('en-IN', {timeStyle: 'short'});

/** The block an uploaded asset becomes when dropped, pasted or inserted. */
function nodeFor(asset: Asset) {
  if (asset.kind === 'image') {
    return {type: 'image', attrs: {src: asset.path, alt: asset.alt, width: asset.width, height: asset.height}};
  }
  if (asset.kind === 'video') return {type: 'videoFile', attrs: {src: asset.path}};
  return {type: 'fileAttachment', attrs: {src: asset.path, name: asset.original_name, size: asset.size, mime: asset.mime}};
}

/**
 * The document as plain JSON. ProseMirror builds node and mark attributes as
 * null-prototype objects, which React can't send to a server action: it
 * silently drops them, losing heading levels, block settings and image paths.
 * A JSON round trip makes every object plain. Every save must go through this.
 */
function plainDocument(editor: TiptapEditor) {
  return JSON.parse(JSON.stringify(editor.getJSON())) as StudioCaseStudy['content'];
}

/** A case study's editable settings (everything but the body). */
function metaOf(study: StudioCaseStudy): StudioMeta {
  return {
    slug: study.slug,
    title: study.title,
    subtitle: study.subtitle,
    label: study.label,
    area: study.area,
    tags: study.tags,
    summary: study.summary,
    focus: study.focus,
    thumbnail_path: study.thumbnail_path,
    thumbnail_alt: study.thumbnail_alt,
    thumbnail_focus: study.thumbnail_focus,
    cover_path: study.cover_path,
    layout: study.layout,
  };
}

/** Widths the preview can be shown at. */
const PREVIEW_WIDTHS = {desktop: 1280, tablet: 834, mobile: 390} as const;

/**
 * The writing page: Notion-like writing and Framer-like composition for a
 * private case study. The canvas has a formatting bar, a "/" insert menu
 * (text, media and visual blocks) and a bubble menu on selected text; the
 * side panel shows the selected block's properties or the case study's
 * settings. Everything autosaves to the user's own private draft; Archive
 * makes it read-only. Media are private uploads, shown via /studio/files.
 */
/** Below this width the side panel becomes a drawer over the document. */
const DRAWER_QUERY = '(max-width: 1023.98px)';

export function Editor({study}: {study: StudioCaseStudy}) {
  return (
    <MediaProvider caseStudyId={study.id}>
      <EditorInner study={study} />
    </MediaProvider>
  );
}

function EditorInner({study}: {study: StudioCaseStudy}) {
  const media = useMedia();
  const [panelTab, setPanelTab] = useState<'block' | 'settings'>('settings');
  const [previewWidth, setPreviewWidth] = useState<keyof typeof PREVIEW_WIDTHS | null>(null);
  const [meta, setMeta] = useState<StudioMeta>(() => metaOf(study));
  const [status, setStatus] = useState<StudioStatus>(study.status);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [savedAt, setSavedAt] = useState(study.updated_at);
  const [error, setError] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);
  /** Below 1024px the side panel is a drawer: closed at first, opened from the top bar. */
  // null = not chosen yet: docked open on wide screens, drawer closed below 1024px.
  const [panelChoice, setIsPanelOpen] = useState<boolean | null>(null);
  const isDrawer = useSyncExternalStore(
    onChange => {
      const query = window.matchMedia(DRAWER_QUERY);
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => window.matchMedia(DRAWER_QUERY).matches,
    () => false,
  );
  const isPanelOpen = panelChoice ?? !isDrawer;
  const [linkDialog, setLinkDialog] = useState<{href: string} | null>(null);
  const [embedDialog, setEmbedDialog] = useState<{kind: 'figma' | 'video'; url: string; error?: string} | null>(null);
  const [uploading, setUploading] = useState(0);

  const metaRef = useRef(meta);
  // The version this tab last saved (or loaded): sent with each save so a newer save elsewhere isn't overwritten.
  const savedAtRef = useRef(study.updated_at);
  const timer = useRef<number | undefined>(undefined);
  const inFlight = useRef<Promise<unknown> | null>(null);
  const editorRef = useRef<TiptapEditor | null>(null);

  /** Saves the current state now (and again afterwards if it changed meanwhile). */
  const saveNow = useCallback(async () => {
    window.clearTimeout(timer.current);
    const editor = editorRef.current;
    if (!editor) return;
    if (inFlight.current) await inFlight.current;
    setSaveState('saving');
    const request = saveStudioCaseStudy(study.id, {...metaRef.current, content: plainDocument(editor)}, savedAtRef.current);
    inFlight.current = request;
    const result = await request;
    inFlight.current = null;
    if (result.ok) {
      setSaveState(current => (current === 'saving' ? 'saved' : current));
      if (result.updatedAt) {
        setSavedAt(result.updatedAt);
        savedAtRef.current = result.updatedAt;
      }
      setError('');
    } else {
      setSaveState('error');
      setError(result.error);
    }
    return result;
  }, [study.id]);

  const scheduleSave = useCallback(() => {
    setSaveState('unsaved');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(saveNow, AUTOSAVE_MS);
  }, [saveNow]);

  /** Uploads a file and drops the right block in at the cursor (or at `pos`). */
  const insertUpload = useCallback(
    async (editor: TiptapEditor | null, file: File, pos?: number) => {
      if (!editor) return;
      setUploading(count => count + 1);
      try {
        const node = nodeFor(await uploadStudioAsset(file, study.id));
        const chain = editor.chain().focus();
        (pos === undefined ? chain.insertContent(node) : chain.insertContentAt(pos, node)).run();
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : 'The upload didn’t finish. Check your connection and try again.');
      } finally {
        setUploading(count => count - 1);
      }
    },
    [study.id],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      ...caseStudyExtensions.filter(extension => !CUSTOM_NODES.has(extension.name)),
      ...editorNodes,
      Placeholder.configure({
        // Every empty section shows its hint (not only the one with the cursor); the hint is
        // never stored, so typing replaces it and the text takes the normal body style.
        showOnlyCurrent: false,
        placeholder: ({editor: e, node, pos, hasAnchor}) => {
          // An empty framework heading shows its title; the paragraph under it shows the hint.
          if (node.type.name === 'heading') return sectionOf(node)?.title ?? (hasAnchor ? 'Section heading' : '');
          if (node.type.name !== 'paragraph') return '';
          const $pos = e.state.doc.resolve(pos);
          const before = $pos.index() > 0 ? $pos.parent.child($pos.index() - 1) : null;
          const hint = before?.type.name === 'heading' ? sectionOf(before)?.hint : undefined;
          return hint ?? (hasAnchor ? 'Start writing, or type / to add a picture, video, file or Figma design' : '');
        },
      }),
    ],
    // Old drafts: untouched template hint text becomes a placeholder (see clearUntouchedHints).
    content: clearUntouchedHints(study.content),
    editable: study.status !== 'archived',
    editorProps: {
      attributes: {class: 'cs-prose write-prose', 'aria-label': 'Case study text'},
      handleKeyDown: (_, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          setLinkDialog({href: (editorRef.current?.getAttributes('link').href as string | undefined) ?? ''});
          return true;
        }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
          event.preventDefault();
          void saveNow();
          return true;
        }
        return false;
      },
      handleDrop: (view, event, _slice, moved) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (moved || !files.length) return false;
        event.preventDefault();
        const pos = view.posAtCoords({left: event.clientX, top: event.clientY})?.pos;
        files.forEach(file => {
          if (studioKindOfFile(file)) void insertUpload(editorRef.current, file, pos);
        });
        return true;
      },
      handlePaste: (_, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (!files.length) return false;
        event.preventDefault();
        files.forEach(file => {
          if (studioKindOfFile(file)) void insertUpload(editorRef.current, file);
        });
        return true;
      },
    },
    // Read-only (archived) documents never autosave; setEditable() itself fires an update.
    onUpdate: ({editor: current}) => {
      if (current.isEditable) scheduleSave();
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Save before leaving, and warn if a save is still pending.
  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (saveState === 'unsaved' || saveState === 'saving') {
        void saveNow();
        event.preventDefault();
      }
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [saveState, saveNow]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const changeMeta = (patch: Partial<StudioMeta>) => {
    if (status === 'archived') return; // read-only until restored
    setMeta(current => {
      const next = {...current, ...patch};
      metaRef.current = next;
      return next;
    });
    scheduleSave();
  };

  const inserts = useMemo(
    () =>
      editor
        ? buildInsertCommands(editor, {
            upload: async (kind: MediaKind) => {
              // From the media library: an earlier upload or a new one.
              const asset = await media.pick(kind);
              if (asset) editor.chain().focus().insertContent(nodeFor(asset)).run();
            },
            askEmbed: kind => setEmbedDialog({kind, url: ''}),
          })
        : [],
    [editor, media],
  );

  // The selected block (if any) and switching the side panel to it.
  const selectedBlock = useEditorState({
    editor,
    selector: ({editor: e}) => (e ? findSelectedBlock(e) : null),
  });
  const selectedKey = selectedBlock ? `${selectedBlock.name}@${selectedBlock.pos}` : '';
  const [lastKey, setLastKey] = useState('');
  if (selectedKey !== lastKey) {
    setLastKey(selectedKey);
    if (selectedKey) {
      setPanelTab('block');
      // Only the docked panel opens itself; a drawer would cover the text on every tap.
      if (!isDrawer) setIsPanelOpen(true);
    }
  }

  /** Archive (saving first) makes the case study read-only; restore makes it editable again. */
  const setArchived = async (archived: boolean) => {
    if (!editor) return;
    if (archived) {
      const saved = await saveNow();
      if (saved && !saved.ok) return;
    }
    setIsArchiving(true);
    const result = archived ? await archiveStudioCaseStudy(study.id) : await restoreStudioCaseStudy(study.id);
    setIsArchiving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.updatedAt) {
      setSavedAt(result.updatedAt);
      savedAtRef.current = result.updatedAt;
    }
    window.clearTimeout(timer.current);
    setStatus(archived ? 'archived' : 'draft');
    setSaveState('saved');
    setError('');
    editor.setEditable(!archived, false);
  };

  const applyLink = (href: string) => {
    if (!editor) return;
    const chain = editor.chain().focus().extendMarkRange('link');
    if (!href.trim()) chain.unsetLink().run();
    else chain.setLink({href: /^(https?:|mailto:|\/|#)/.test(href.trim()) ? href.trim() : `https://${href.trim()}`}).run();
    setLinkDialog(null);
  };

  const applyEmbed = () => {
    if (!editor || !embedDialog) return;
    const parsed = parseEmbed(embedDialog.url);
    const wantsFigma = embedDialog.kind === 'figma';
    if (!parsed || (wantsFigma ? parsed.provider !== 'figma' : parsed.provider === 'figma')) {
      setEmbedDialog({
        ...embedDialog,
        error: wantsFigma
          ? 'That isn’t a Figma link. Paste a link that starts with https://www.figma.com/.'
          : 'That isn’t a supported video link. Paste a link from YouTube, Vimeo or Loom.',
      });
      return;
    }
    editor.chain().focus().insertContent({type: 'embed', attrs: {src: embedDialog.url.trim()}}).run();
    setEmbedDialog(null);
  };

  const saveLabel =
    uploading > 0
      ? 'Uploading…'
      : saveState === 'saving'
        ? 'Saving…'
        : saveState === 'unsaved'
          ? 'Unsaved changes'
          : saveState === 'error'
            ? 'Not saved'
            : `Saved · ${TIME.format(new Date(savedAt))}`;

  const archiveLabel = status === 'archived' ? 'Restore' : 'Archive';
  const openPreview = async () => {
    await saveNow();
    setPreviewWidth('desktop');
  };

  return (
    <VStack gap={0} className="write" data-panel={isPanelOpen ? 'open' : 'closed'}>
      {/* Top bar: back, where it stands, preview and archive. */}
      <HStack className="studio-bar glass glass-bar" justify="between" vAlign="center" gap={3}>
        <HStack gap={3} vAlign="center">
          <span className="only-wide">
            <Button
              label="Your case studies"
              variant="ghost"
              size="sm"
              className="back-cta"
              href="/studio"
              icon={<Icon icon={ArrowLeft} size="sm" color="inherit" />}
            />
          </span>
          <span className="only-narrow">
            <IconButton
              label="Back to your case studies"
              tooltip="Your case studies"
              variant="ghost"
              size="sm"
              className="back-cta"
              href="/studio"
              icon={<Icon icon={ArrowLeft} size="sm" color="inherit" />}
            />
          </span>
          <Text
            type="supporting"
            className="only-wide"
            style={{...EYEBROW_STYLE, color: 'var(--color-text-secondary)'}}>
            {status === 'archived' ? 'Archived' : 'Private draft'}
          </Text>
          <Text type="supporting" color="secondary" aria-live="polite">
            {saveLabel}
          </Text>
        </HStack>
        <HStack gap={2} vAlign="center">
          {/* Phones get the same actions as icon-only buttons (labels as tooltips). */}
          <span className="only-wide">
            <HStack gap={2} vAlign="center">
              <Button label="Preview" variant="ghost" size="sm" onClick={openPreview} icon={<Icon icon={Eye} size="sm" color="inherit" />} />
              <Button
                label={archiveLabel}
                variant={status === 'archived' ? 'primary' : 'destructive'}
                size="sm"
                isLoading={isArchiving}
                onClick={() => setArchived(status !== 'archived')}
                icon={<Icon icon={status === 'archived' ? ArchiveRestore : Archive} size="sm" color="inherit" />}
              />
            </HStack>
          </span>
          <span className="only-narrow">
            <HStack gap={2} vAlign="center">
              <IconButton label="Preview" tooltip="Preview" variant="ghost" size="sm" onClick={openPreview} icon={<Icon icon={Eye} size="sm" color="inherit" />} />
              <IconButton
                label={archiveLabel}
                tooltip={archiveLabel}
                variant={status === 'archived' ? 'primary' : 'destructive'}
                size="sm"
                isLoading={isArchiving}
                onClick={() => setArchived(status !== 'archived')}
                icon={<Icon icon={status === 'archived' ? ArchiveRestore : Archive} size="sm" color="inherit" />}
              />
            </HStack>
          </span>
          <IconButton
            label={isPanelOpen ? 'Hide settings panel' : 'Show settings panel'}
            tooltip={isPanelOpen ? 'Hide settings panel' : 'Show settings panel'}
            variant={isPanelOpen ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() =>
              setIsPanelOpen(!isPanelOpen)
            }
            icon={<Icon icon={PanelRight} size="sm" color="inherit" />}
          />
        </HStack>
      </HStack>

      {status === 'archived' && (
        <Banner
          status="info"
          title="This case study is archived"
          description="It’s read-only and still private. Restore it to keep editing."
          container="section"
          collapsible={false}
        />
      )}

      {error && (
        <Banner status="error" title={error} container="section" isDismissable onDismiss={() => setError('')} collapsible={false} />
      )}

      <HStack gap={0} vAlign="start" className="write-main">
        <VStack gap={0} className="write-canvas">
          {editor && (
            <>
              <Toolbar
                editor={editor}
                inserts={inserts}
                onLink={() => setLinkDialog({href: (editor.getAttributes('link').href as string | undefined) ?? ''})}
              />
              <BubbleMenu editor={editor} className="write-bubble glass glass-group glass--interactive">
                <HStack gap={1}>
                  <IconButton
                    label="Bold"
                    size="sm"
                    variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
                    icon={<Icon icon={Bold} size="sm" color="inherit" />}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                  />
                  <IconButton
                    label="Italic"
                    size="sm"
                    variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
                    icon={<Icon icon={Italic} size="sm" color="inherit" />}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                  />
                  <IconButton
                    label="Underline"
                    size="sm"
                    variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
                    icon={<Icon icon={Underline} size="sm" color="inherit" />}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                  />
                  <IconButton
                    label="Link"
                    size="sm"
                    variant={editor.isActive('link') ? 'secondary' : 'ghost'}
                    icon={<Icon icon={Link2} size="sm" color="inherit" />}
                    onClick={() => setLinkDialog({href: (editor.getAttributes('link').href as string | undefined) ?? ''})}
                  />
                </HStack>
              </BubbleMenu>
              <SlashMenu editor={editor} commands={inserts} />
            </>
          )}
          {/* Only the writing scrolls (tablet/desktop): its scrollbar starts below the toolbar. */}
          <div className="write-scroll">
            <EditorContent editor={editor} className="write-document" />
          </div>
        </VStack>

        {isDrawer && isPanelOpen && (
          // Drawer backdrop (shown below 1024px only): tap to close.
          <button type="button" className="write-side-scrim" aria-label="Close settings" onClick={() => setIsPanelOpen(false)} />
        )}
        {isPanelOpen && (
          <VStack gap={0} className="write-side">
            <HStack className="write-side-tabs">
              <SegmentedControl
                label="Side panel"
                value={panelTab}
                onChange={value => setPanelTab(value as 'block' | 'settings')}
                size="sm"
                layout="fill">
                <SegmentedControlItem value="block" label="Block" />
                <SegmentedControlItem value="settings" label="Case study" />
              </SegmentedControl>
            </HStack>
            {panelTab === 'block' ? (
              <VStack gap={0} className="write-settings">
                {editor && selectedBlock ? (
                  <BlockInspector key={selectedKey} editor={editor} block={selectedBlock} />
                ) : (
                  <VStack gap={2}>
                    <Text weight="semibold">No block selected</Text>
                    <Text color="secondary">
                      Select a visual block, or its Properties button, to change its layout, media and captions.
                    </Text>
                  </VStack>
                )}
              </VStack>
            ) : (
              <SettingsPanel meta={meta} onChange={changeMeta} />
            )}
          </VStack>
        )}
      </HStack>

      {/* Preview at desktop, tablet and phone widths (the draft, as the site will show it). */}
      <Dialog isOpen={previewWidth !== null} onOpenChange={open => !open && setPreviewWidth(null)} variant="fullscreen">
        <DialogHeader
          title="Preview"
          subtitle="Your private draft at desktop, tablet and phone widths. Only you can see it."
          onOpenChange={open => !open && setPreviewWidth(null)}
          endContent={
            <HStack gap={2} vAlign="center">
              <SegmentedControl
                label="Preview width"
                value={previewWidth ?? 'desktop'}
                onChange={value => setPreviewWidth(value as keyof typeof PREVIEW_WIDTHS)}
                size="sm">
                <SegmentedControlItem value="desktop" label="Desktop" icon={<Icon icon={Monitor} size="sm" color="inherit" />} />
                <SegmentedControlItem value="tablet" label="Tablet" icon={<Icon icon={Tablet} size="sm" color="inherit" />} />
                <SegmentedControlItem value="mobile" label="Mobile" icon={<Icon icon={Smartphone} size="sm" color="inherit" />} />
              </SegmentedControl>
              <Button label="Open preview in a new tab" size="sm" variant="ghost" href={`/studio/case-studies/${study.id}/preview`} target="_blank" />
            </HStack>
          }
        />
        {previewWidth && (
          <VStack gap={0} hAlign="center" className="write-preview-stage">
            <iframe
              key={previewWidth}
              className="write-preview-frame"
              title={`Preview at ${previewWidth} width`}
              src={`/studio/case-studies/${study.id}/preview?embed=1`}
              style={{inlineSize: `min(100%, ${PREVIEW_WIDTHS[previewWidth]}px)`}}
            />
          </VStack>
        )}
      </Dialog>

      {/* Link */}
      <Dialog isOpen={linkDialog !== null} onOpenChange={open => !open && setLinkDialog(null)} purpose="form" width={460}>
        <DialogHeader title="Add a link" onOpenChange={open => !open && setLinkDialog(null)} />
        <form
          onSubmit={event => {
            event.preventDefault();
            applyLink(linkDialog?.href ?? '');
          }}>
          <VStack gap={4} className="write-dialog-body">
            <TextInput
              label="Web address (URL)"
              hasAutoFocus
              placeholder="https://…"
              value={linkDialog?.href ?? ''}
              onChange={href => setLinkDialog({href})}
              width="100%"
            />
            <HStack gap={2} hAlign="end">
              <Button label="Remove link" variant="destructive" onClick={() => applyLink('')} />
              <Button label="Save link" variant="primary" type="submit" />
            </HStack>
          </VStack>
        </form>
      </Dialog>

      {/* Figma / video embed */}
      <Dialog isOpen={embedDialog !== null} onOpenChange={open => !open && setEmbedDialog(null)} purpose="form" width={520}>
        <DialogHeader
          title={embedDialog?.kind === 'figma' ? 'Embed a Figma design' : 'Embed a video'}
          subtitle={
            embedDialog?.kind === 'figma'
              ? 'In Figma, select Share, then Copy link. Anyone with the link must be able to view the file.'
              : 'Paste a link to a video on YouTube, Vimeo or Loom.'
          }
          onOpenChange={open => !open && setEmbedDialog(null)}
        />
        <form
          onSubmit={event => {
            event.preventDefault();
            applyEmbed();
          }}>
          <VStack gap={4} className="write-dialog-body">
            <TextInput
              label={embedDialog?.kind === 'figma' ? 'Figma link' : 'Video link'}
              hasAutoFocus
              placeholder={embedDialog?.kind === 'figma' ? 'https://www.figma.com/design/…' : 'https://youtu.be/…'}
              value={embedDialog?.url ?? ''}
              onChange={url => embedDialog && setEmbedDialog({...embedDialog, url, error: undefined})}
              status={embedDialog?.error ? {type: 'error', message: embedDialog.error} : undefined}
              width="100%"
            />
            <HStack gap={2} hAlign="end">
              <Button label="Cancel" variant="ghost" onClick={() => setEmbedDialog(null)} />
              <Button label="Embed" variant="primary" type="submit" />
            </HStack>
          </VStack>
        </form>
      </Dialog>

    </VStack>
  );
}
