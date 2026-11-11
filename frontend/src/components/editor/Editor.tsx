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
import {Archive, ArchiveRestore, ArrowLeft, ClipboardCheck, History, Redo2, Undo2, Bold, Code, Eye, Highlighter, Italic, Link2, ListTree, Monitor, MoreHorizontal, PanelRight, RemoveFormatting, Smartphone, Strikethrough, Tablet, Underline} from 'lucide-react';
import {TextSelection} from '@tiptap/pm/state';
import {Switch} from '@astryxdesign/core/Switch';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {StudioSearch} from './search';
import {FindReplace} from './FindReplace';
import {TableBar} from './TableBar';
import {LatestDoc, SectionIds, SectionLabels, activeSectionIndex, outlineOf} from './sections';
import {StoryOutline} from './StoryOutline';
import {SectionGuide} from './SectionGuide';
import {TitleFields} from './TitleFields';
import {RovingToolbar} from './RovingToolbar';
import {BlockHandle} from './BlockHandle';
import {currentTopLevelBlock, duplicateBlock, moveTopLevelBlock, turnBlockInto} from './blockOps';
import {turnIntoTargets} from './blocks/registry';
import {ExportMenu} from '@/components/studio/ExportMenu';
import {ASSET_DRAG_TYPE, MediaPanel} from './MediaPanel';
import {ReviewDialog} from './ReviewDialog';
import {HistoryDialog} from './HistoryDialog';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {caseStudyExtensions} from '@/components/caseStudy/schema';
import {parseEmbed} from '@/lib/caseStudies/embeds';
import {DEFAULT_FRAMEWORK, getFramework, reviewCaseStudy, sectionOf, slugify, type StoryReview} from '@studio/shared';
import type {StudioCaseStudy, StudioMeta, StudioStatus} from '@studio/shared';
import {archiveStudioCaseStudy, getSectionNotes, restoreStudioCaseStudy, saveStudioCaseStudy} from '@/app/studio/case-study-actions';
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

/** Whether a selection is inside one of the visual blocks (which have their own bar above them). */
function isInsideBlock(selection: TextSelection) {
  const {$from} = selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) if (CUSTOM_NODES.has($from.node(depth).type.name)) return true;
  return false;
}

/** "Turn into" for the selection toolbar's More menu: the block with the selection, text types only. */
function selectionTurnInto(editor: TiptapEditor) {
  const block = currentTopLevelBlock(editor);
  if (!block) return [];
  const targets = turnIntoTargets(block.node).filter(target => !['showcase', 'image-grid', 'image'].includes(target.id));
  if (!targets.length) return [];
  return [
    {
      type: 'section' as const,
      title: 'Turn into',
      items: targets.map(target => ({
        label: target.label,
        icon: <Icon icon={target.icon} size="sm" color="inherit" />,
        onClick: () => turnBlockInto(editor, block.pos, target.id),
      })),
    },
  ];
}

/** The platform's command key, for tooltips (⌘ on Apple devices, Ctrl+ elsewhere). */
const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';

const TIME = new Intl.DateTimeFormat('en-IN', {timeStyle: 'short'});

/** The block an uploaded asset becomes when dropped, pasted or inserted. */
function nodeFor(asset: Asset) {
  if (asset.kind === 'image') {
    return {type: 'image', attrs: {src: asset.path, alt: asset.alt, width: asset.width, height: asset.height}};
  }
  if (asset.kind === 'video') return {type: 'videoFile', attrs: {src: asset.path}};
  return {type: 'fileAttachment', attrs: {src: asset.path, name: asset.original_name, size: asset.size, mime: asset.mime}};
}

/** What the link editor is editing. */
type LinkDraft = {href: string; text: string; newTab: boolean; isNew: boolean; from: number; to: number; error?: string};

/** Opens the link editor on the link under the cursor (all of it) or on the selected text. */
function linkDraftFor(editor: TiptapEditor): LinkDraft {
  const isLink = editor.isActive('link');
  if (isLink) editor.chain().extendMarkRange('link').run();
  const {from, to} = editor.state.selection;
  const attrs = editor.getAttributes('link');
  return {
    href: (attrs.href as string | undefined) ?? '',
    text: editor.state.doc.textBetween(from, to, ' '),
    newTab: isLink ? attrs.target === '_blank' : true,
    isNew: !isLink,
    from,
    to,
  };
}

/**
 * A safe link address, or null. Only web, email and phone links (and links within the page or
 * site) are allowed; anything else (javascript:, data:, file:…) is refused. A bare address like
 * "example.com" becomes https://example.com.
 */
export function safeHref(input: string): string | null {
  const href = input.trim();
  if (!href || /\s/.test(href)) return null;
  if (href.startsWith('/') || href.startsWith('#')) return href;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href)?.[1]?.toLowerCase();
  if (!scheme) return `https://${href}`;
  return ['https', 'http', 'mailto', 'tel'].includes(scheme) ? href : null;
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
    project_type: study.project_type ?? null,
    role: study.role ?? '',
    team: study.team ?? '',
    timeline: study.timeline ?? '',
    platform: study.platform ?? '',
    objective: study.objective ?? '',
    challenge: study.challenge ?? '',
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
type PanelTab = 'guide' | 'block' | 'media' | 'settings';
const DRAWER_QUERY = '(max-width: 1023.98px)';
/** From this width the outline is docked on the left; below it, it's a drawer. */
const OUTLINE_QUERY = '(min-width: 1280px)';

/** Subscribes to a media query (hydration-safe: `fallback` on the server). */
function useMediaQuery(query: string, fallback: boolean) {
  return useSyncExternalStore(
    onChange => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

export function Editor({study}: {study: StudioCaseStudy}) {
  return (
    <MediaProvider caseStudyId={study.id}>
      <EditorInner study={study} />
    </MediaProvider>
  );
}

/** The placeholder in an empty callout: the problem, the takeaway, or a plain note. */
function calloutHint({tone, icon}: {tone: string; icon: string}) {
  if (tone === 'warning') return 'The problem in one sentence';
  if (icon === 'star') return 'The one thing to remember';
  if (tone === 'success') return 'The result, and what it changed';
  return 'Write the note';
}

function EditorInner({study}: {study: StudioCaseStudy}) {
  const media = useMedia();
  const [panelTab, setPanelTab] = useState<PanelTab>('guide');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const isOutlineDocked = useMediaQuery(OUTLINE_QUERY, true);
  // null = not chosen: docked open on wide screens, a closed drawer below 1280px.
  const [outlineChoice, setOutlineChoice] = useState<boolean | null>(null);
  const isOutlineOpen = outlineChoice ?? isOutlineDocked;
  const framework = getFramework(study.framework_id, study.framework_version) ?? DEFAULT_FRAMEWORK;
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
  const isDrawer = useMediaQuery(DRAWER_QUERY, false);
  const isHeaderCompact = useMediaQuery('(max-width: 1023.98px)', false);
  // From 768px only the story column scrolls (not the window): floating bars follow it.
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const [documentElement, setDocumentElement] = useState<HTMLDivElement | null>(null);
  const isPanelOpen = panelChoice ?? !isDrawer;
  /** The link editor: address, displayed text, new tab, and the range it applies to. */
  const [linkDialog, setLinkDialog] = useState<LinkDraft | null>(null);
  const [isFindOpen, setIsFindOpen] = useState(false);
  /** The review, worked out when the Review dialog opens (from the document as it is then). */
  const [review, setReview] = useState<StoryReview | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [embedDialog, setEmbedDialog] = useState<{kind: 'figma' | 'video'; url: string; error?: string} | null>(null);
  const [uploading, setUploading] = useState(0);

  const metaRef = useRef(meta);
  /** A draft still on its generated short name follows the title until the user sets one. */
  const slugIsAuto = useRef(study.slug.startsWith('untitled-'));
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
      StudioSearch,
      SectionIds,
      SectionLabels,
      LatestDoc,
      Placeholder.configure({
        // Every empty section shows its hint (not only the one with the cursor); the hint is
        // never stored, so typing replaces it and the text takes the normal body style.
        showOnlyCurrent: false,
        // Children too, for the callout cards' hints (other nested paragraphs return nothing).
        includeChildren: true,
        placeholder: ({editor: e, node, pos, hasAnchor}) => {
          // An empty framework heading shows its title; the paragraph under it shows the hint.
          if (node.type.name === 'heading') return sectionOf(node)?.title ?? (hasAnchor ? 'Section heading' : '');
          if (node.type.name !== 'paragraph') return '';
          // The doc being applied (see LatestDoc), not the editor's previous state.
          const doc = (e.storage as {latestDoc?: {doc: typeof e.state.doc | null}}).latestDoc?.doc ?? e.state.doc;
          if (pos > doc.content.size) return '';
          const $pos = doc.resolve(pos);
          const before = $pos.index() > 0 ? $pos.parent.child($pos.index() - 1) : null;
          const hint = before?.type.name === 'heading' ? sectionOf(before)?.hint : undefined;
          // Content cards (T4): an empty callout says what goes in it, by its look.
          if ($pos.parent.type.name === 'callout') return $pos.parent.childCount === 1 ? calloutHint($pos.parent.attrs as {tone: string; icon: string}) : '';
          // Other nested paragraphs (lists, tables, split layouts) stay as they were: no placeholder.
          if ($pos.parent.type.name !== 'doc') return '';
          return hint ?? (hasAnchor ? 'Start writing, or type / to add a picture, video, file or Figma design' : '');
        },
      }),
    ],
    // Always the current schema: the API migrates older documents (with a backup) before sending them.
    content: study.content,
    editable: study.status !== 'archived',
    editorProps: {
      attributes: {class: 'cs-prose write-prose', 'aria-label': 'Case study text'},
      handleKeyDown: (_, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          if (editorRef.current) setLinkDialog(linkDraftFor(editorRef.current));
          return true;
        }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
          event.preventDefault();
          setIsFindOpen(true);
          return true;
        }
        // Blocks (editor spec §7, T2): ⌥⇧↑ / ⌥⇧↓ move the block with the cursor, ⌘D duplicates it.
        if (event.altKey && event.shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown') && editorRef.current) {
          const block = currentTopLevelBlock(editorRef.current);
          if (block) {
            event.preventDefault();
            moveTopLevelBlock(editorRef.current, block.pos, event.key === 'ArrowUp' ? -1 : 1);
            return true;
          }
        }
        if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'd' && editorRef.current) {
          const block = currentTopLevelBlock(editorRef.current);
          if (block) {
            event.preventDefault();
            duplicateBlock(editorRef.current, block.pos);
            return true;
          }
        }
        // Up from the very start of the story: into the subtitle above it.
        if (event.key === 'ArrowUp' && editorRef.current && editorRef.current.state.selection.from <= 1 && !event.shiftKey) {
          const subtitle = document.querySelector<HTMLTextAreaElement>('.write-subtitle');
          if (subtitle) {
            event.preventDefault();
            subtitle.focus();
            return true;
          }
        }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
          event.preventDefault();
          void saveNow();
          return true;
        }
        return false;
      },
      handleDrop: (view, event, _slice, moved) => {
        // A file dragged from the Media tab: drop it where it lands.
        const dragged = event.dataTransfer?.getData(ASSET_DRAG_TYPE);
        if (dragged) {
          event.preventDefault();
          const pos = view.posAtCoords({left: event.clientX, top: event.clientY})?.pos;
          try {
            const node = nodeFor(JSON.parse(dragged) as Asset);
            const chain = editorRef.current?.chain().focus();
            if (chain) (pos === undefined ? chain.insertContent(node) : chain.insertContentAt(pos, node)).run();
          } catch {
            // Not one of ours: ignore it.
          }
          return true;
        }
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

  // The floating bars (text bubble, table bar) only follow window scrolling by themselves, so
  // when the column scrolls, ask them to reposition (one transaction per frame, no doc change).
  useEffect(() => {
    if (!scrollElement) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const current = editorRef.current;
        if (!current || current.isDestroyed || (current.state.selection.empty && !current.isActive('table'))) return;
        const tr = current.state.tr;
        for (const key of ['studioTextBubble', 'studioTextBubbleBelow', 'studioTableBar']) tr.setMeta(key, 'updatePosition');
        current.view.dispatch(tr);
      });
    };
    scrollElement.addEventListener('scroll', onScroll, {passive: true});
    return () => {
      scrollElement.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [scrollElement]);

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

  // Drawers (outline below 1280px, side panel below 1024px): Escape closes the open one and
  // puts the focus back on the button that opened it.
  const isOutlineDrawer = !isOutlineDocked && isOutlineOpen;
  const isSideDrawer = isDrawer && isPanelOpen;
  useEffect(() => {
    if (!isOutlineDrawer && !isSideDrawer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (document.querySelector('[role=dialog], [role=alertdialog], [role=menu]')?.checkVisibility?.()) return;
      if (isOutlineDrawer) {
        setOutlineChoice(false);
        document.getElementById('write-outline-toggle')?.focus();
      } else {
        setIsPanelOpen(false);
        document.getElementById('write-panel-toggle')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOutlineDrawer, isSideDrawer]);
  // Opening a drawer moves the focus into it.
  useEffect(() => {
    if (isOutlineDrawer) requestAnimationFrame(() => document.querySelector<HTMLElement>('.write-outline-link[aria-current], .write-outline-link')?.focus());
  }, [isOutlineDrawer]);

  // The browser tab names the case study being edited, and follows the title as it changes.
  useEffect(() => {
    const name = meta.title.replace(/\*/g, '').trim() || 'Untitled case study';
    document.title = `Edit: ${name} · Case Study Studio`;
  }, [meta.title]);

  // Private section notes (kept outside the document).
  useEffect(() => {
    let isCancelled = false;
    void getSectionNotes(study.id).then(result => {
      if (isCancelled) return;
      if (result.ok) setNotes(result.notes);
      else setError(result.error);
    });
    return () => {
      isCancelled = true;
    };
  }, [study.id]);

  // Undo / redo availability, for the header buttons.
  const history = useEditorState({
    editor,
    selector: ({editor: e}) => ({canUndo: Boolean(e?.can().undo()), canRedo: Boolean(e?.can().redo())}),
  }) ?? {canUndo: false, canRedo: false};

  // The story outline, worked out from the document, and the section the cursor is in.
  const outline = useEditorState({
    editor,
    selector: ({editor: e}) => {
      if (!e) return {sections: [], active: -1};
      const sections = outlineOf(e.state.doc);
      return {sections, active: activeSectionIndex(sections, e.state.selection.from)};
    },
  }) ?? {sections: [], active: -1};

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
            framework,
          })
        : [],
    [editor, media, framework],
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
    } else if (panelTab === 'block') {
      // Back in the text: back to the guidance for the section.
      setPanelTab('guide');
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

  /** Applies the link editor: sets or updates the link (and its text), or removes it. */
  const applyLink = (draft: LinkDraft, remove = false) => {
    if (!editor) return;
    const range = {from: draft.from, to: draft.to};
    if (remove || !draft.href.trim()) {
      editor.chain().focus().setTextSelection(range).extendMarkRange('link').unsetLink().run();
      setLinkDialog(null);
      return;
    }
    const href = safeHref(draft.href);
    if (!href) {
      setLinkDialog({...draft, error: 'Enter a web address that starts with https://, or an email address link that starts with mailto:.'});
      return;
    }
    const attrs = {href, target: draft.newTab ? '_blank' : null};
    const current = editor.state.doc.textBetween(draft.from, draft.to, ' ');
    const text = draft.text.trim() || current || href;
    if (draft.from === draft.to || text !== current) {
      editor.chain().focus().insertContentAt(range, {type: 'text', text, marks: [{type: 'link', attrs}]}).run();
    } else {
      editor.chain().focus().setTextSelection(range).setLink(attrs).run();
    }
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
  const openReview = () => {
    if (!editor) return;
    setReview(
      reviewCaseStudy({
        title: meta.title,
        content: plainDocument(editor),
        cover_path: meta.cover_path,
        thumbnail_path: meta.thumbnail_path,
        thumbnail_alt: meta.thumbnail_alt,
        framework,
      }),
    );
    setIsReviewOpen(true);
  };
  const openPreview = async () => {
    await saveNow();
    setPreviewWidth('desktop');
  };

  return (
    <VStack gap={0} className="write" data-panel={isPanelOpen ? 'open' : 'closed'}>
      {/* Top bar: back, where it stands, preview and archive. */}
      {/* Screen readers: the page's name, and ways past the bars to the story or the outline. */}
      <h1 className="sr-only">Edit: {meta.title.replace(/\*/g, '').trim() || 'Untitled case study'}</h1>
      <nav aria-label="Skip links" className="skip-links">
        <button type="button" className="skip-link" onClick={() => editor?.commands.focus()}>
          Skip to the story
        </button>
        <button
          type="button"
          className="skip-link"
          onClick={() => {
            setOutlineChoice(true);
            requestAnimationFrame(() => document.querySelector<HTMLElement>('.write-outline-link')?.focus());
          }}>
          Skip to the outline
        </button>
      </nav>
      <HStack className="studio-bar glass glass-bar" justify="between" vAlign="center" gap={3} role="banner">
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
          <IconButton
            id="write-outline-toggle"
            label={isOutlineOpen ? 'Hide outline' : 'Show outline'}
            tooltip={isOutlineOpen ? 'Hide outline' : 'Show outline'}
            variant={isOutlineOpen ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setOutlineChoice(!isOutlineOpen)}
            icon={<Icon icon={ListTree} size="sm" color="inherit" />}
          />
          <Text
            type="supporting"
            className="only-wide studio-bar-save"
            style={{...EYEBROW_STYLE, color: 'var(--color-text-secondary)'}}>
            {status === 'archived' ? 'Archived' : 'Private draft'}
          </Text>
          {/* Not a live region: it changes on every pause in typing. Failures show as an alert. */}
          <Text type="supporting" color="secondary" className="studio-bar-save">
            <span className="only-wide">{saveLabel}</span>
            {/* Phones: without the time, so every header button fits at 375px. */}
            <span className="only-narrow">{saveState === 'saved' && uploading === 0 ? 'Saved' : saveState === 'unsaved' ? 'Unsaved' : saveLabel}</span>
          </Text>
        </HStack>
        <HStack gap={2} vAlign="center">
          {/* Phones get the same actions as icon-only buttons (labels as tooltips). */}
          <span className="only-wide">
            <HStack gap={2} vAlign="center">
              {/* Undo / redo (editor spec §4, T1). Phones keep them in the toolbar's ⌃ sheet. */}
              <HStack gap={1} vAlign="center" className="studio-bar-history">
                <IconButton
                  label="Undo"
                  tooltip={history.canUndo ? `Undo (${MOD}Z)` : 'Nothing to undo'}
                  variant="ghost"
                  size="sm"
                  isDisabled={!history.canUndo || status === 'archived'}
                  onClick={() => editor?.chain().focus().undo().run()}
                  icon={<Icon icon={Undo2} size="sm" color="inherit" />}
                />
                <IconButton
                  label="Redo"
                  tooltip={history.canRedo ? `Redo (${MOD === '⌘' ? '⇧⌘' : 'Ctrl+Shift+'}Z)` : 'Nothing to redo'}
                  variant="ghost"
                  size="sm"
                  isDisabled={!history.canRedo || status === 'archived'}
                  onClick={() => editor?.chain().focus().redo().run()}
                  icon={<Icon icon={Redo2} size="sm" color="inherit" />}
                />
              </HStack>
              {/* 768–1023px: the same actions, icon-only (names in tooltips), so the bar fits. */}
              {isHeaderCompact ? (
                <>
                  <IconButton label="Review" tooltip="Review" variant="ghost" size="sm" onClick={openReview} icon={<Icon icon={ClipboardCheck} size="sm" color="inherit" />} />
                  <IconButton label="Version history" tooltip="Version history" variant="ghost" size="sm" onClick={() => setIsHistoryOpen(true)} icon={<Icon icon={History} size="sm" color="inherit" />} />
                  <IconButton label="Preview" tooltip="Preview" variant="ghost" size="sm" onClick={openPreview} icon={<Icon icon={Eye} size="sm" color="inherit" />} />
                  <ExportMenu isIconOnly title={meta.title.replace(/\*/g, '').trim() || 'Untitled case study'} previewHref={`/studio/case-studies/${study.id}/preview`} beforeOpen={saveNow} />
                  <IconButton
                    label={archiveLabel}
                    tooltip={archiveLabel}
                    variant={status === 'archived' ? 'primary' : 'destructive'}
                    size="sm"
                    isLoading={isArchiving}
                    onClick={() => setArchived(status !== 'archived')}
                    icon={<Icon icon={status === 'archived' ? ArchiveRestore : Archive} size="sm" color="inherit" />}
                  />
                </>
              ) : (
                <>
                  <Button label="Review" variant="ghost" size="sm" onClick={openReview} icon={<Icon icon={ClipboardCheck} size="sm" color="inherit" />} />
                  <Button label="History" aria-label="Version history" variant="ghost" size="sm" onClick={() => setIsHistoryOpen(true)} icon={<Icon icon={History} size="sm" color="inherit" />} />
                  <Button label="Preview" variant="ghost" size="sm" onClick={openPreview} icon={<Icon icon={Eye} size="sm" color="inherit" />} />
                  <ExportMenu title={meta.title.replace(/\*/g, '').trim() || 'Untitled case study'} previewHref={`/studio/case-studies/${study.id}/preview`} beforeOpen={saveNow} />
                  <Button
                    label={archiveLabel}
                    variant={status === 'archived' ? 'primary' : 'destructive'}
                    size="sm"
                    isLoading={isArchiving}
                    onClick={() => setArchived(status !== 'archived')}
                    icon={<Icon icon={status === 'archived' ? ArchiveRestore : Archive} size="sm" color="inherit" />}
                  />
                </>
              )}
            </HStack>
          </span>
          <span className="only-narrow">
            <HStack gap={2} vAlign="center">
              <IconButton label="Review" tooltip="Review" variant="ghost" size="sm" onClick={openReview} icon={<Icon icon={ClipboardCheck} size="sm" color="inherit" />} />
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
            id="write-panel-toggle"
            label={isPanelOpen ? 'Hide side panel' : 'Show side panel'}
            tooltip={isPanelOpen ? 'Hide side panel' : 'Show side panel'}
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
        {!isOutlineDocked && isOutlineOpen && (
          <button type="button" className="write-outline-scrim" aria-label="Close outline" tabIndex={-1} onClick={() => setOutlineChoice(false)} />
        )}
        {editor && isOutlineOpen && (
          <StoryOutline
            editor={editor}
            sections={outline.sections}
            active={outline.active}
            framework={framework}
            isEditable={status !== 'archived'}
            onNavigate={() => {
              setPanelTab('guide');
              if (!isOutlineDocked) setOutlineChoice(false);
            }}
            onClose={isOutlineDocked ? undefined : () => setOutlineChoice(false)}
          />
        )}
        <VStack gap={0} className="write-canvas" role="main" aria-label="Story">
          {editor && (
            <>
              <Toolbar
                editor={editor}
                inserts={inserts}
                onLink={() => setLinkDialog(linkDraftFor(editor))}
                onFind={() => setIsFindOpen(true)}
              />
              {isFindOpen && <FindReplace editor={editor} onClose={() => setIsFindOpen(false)} />}
              <TableBar editor={editor} />
              {/* Selected text (spec A4): B, I, U, link, highlight, More. Hidden in tables (the
                  table bar takes over) and for block selections (the inspector takes over). */}
              {/* Inside a visual block (split layout, quote, callout) the block's own bar sits above the
                  text, so there the bubble opens below the selection instead of covering it. */}
              {(['above', 'below'] as const).map(where => (
                <BubbleMenu
                  key={where}
                  editor={editor}
                  pluginKey={where === 'above' ? 'studioTextBubble' : 'studioTextBubbleBelow'}
                  className="write-bubble glass glass-group glass--interactive"
                  options={{placement: where === 'above' ? 'top' : 'bottom', offset: 8, flip: true, shift: {padding: 8}}}
                  shouldShow={({editor: e, state: s}) =>
                    !isFindOpen &&
                    e.isEditable &&
                    !s.selection.empty &&
                    s.selection instanceof TextSelection &&
                    !e.isActive('table') &&
                    isInsideBlock(s.selection) === (where === 'below')
                  }>
                  <RovingToolbar gap={1} label="Selected text">
                  <IconButton label="Bold" tooltip="Bold" size="sm" variant={editor.isActive('bold') ? 'secondary' : 'ghost'} icon={<Icon icon={Bold} size="sm" color="inherit" />} onClick={() => editor.chain().focus().toggleBold().run()} />
                  <IconButton label="Italic" tooltip="Italic" size="sm" variant={editor.isActive('italic') ? 'secondary' : 'ghost'} icon={<Icon icon={Italic} size="sm" color="inherit" />} onClick={() => editor.chain().focus().toggleItalic().run()} />
                  <IconButton label="Underline" tooltip="Underline" size="sm" variant={editor.isActive('underline') ? 'secondary' : 'ghost'} icon={<Icon icon={Underline} size="sm" color="inherit" />} onClick={() => editor.chain().focus().toggleUnderline().run()} />
                  <IconButton label="Link" tooltip="Link" size="sm" variant={editor.isActive('link') ? 'secondary' : 'ghost'} icon={<Icon icon={Link2} size="sm" color="inherit" />} onClick={() => setLinkDialog(linkDraftFor(editor))} />
                  <IconButton
                    label="Highlight"
                    tooltip="Highlight"
                    size="sm"
                    variant={editor.isActive('highlight') ? 'secondary' : 'ghost'}
                    icon={<Icon icon={Highlighter} size="sm" color="inherit" />}
                    onClick={() =>
                      editor.isActive('highlight')
                        ? editor.chain().focus().unsetHighlight().run()
                        : editor.chain().focus().setHighlight({color: 'var(--color-background-yellow)'}).run()
                    }
                  />
                  <DropdownMenu
                    renderTrigger={props => <IconButton {...props} label="More formatting" tooltip="More formatting" size="sm" variant="ghost" icon={<Icon icon={MoreHorizontal} size="sm" color="inherit" />} />}
                    items={[
                      {
                        type: 'section' as const,
                        title: 'Format',
                        items: [
                          {label: 'Strikethrough', icon: <Icon icon={Strikethrough} size="sm" color="inherit" />, onClick: () => editor.chain().focus().toggleStrike().run()},
                          {label: 'Inline code', icon: <Icon icon={Code} size="sm" color="inherit" />, onClick: () => editor.chain().focus().toggleCode().run()},
                          {label: 'Clear formatting', icon: <Icon icon={RemoveFormatting} size="sm" color="inherit" />, onClick: () => editor.chain().focus().unsetAllMarks().run()},
                        ],
                      },
                      // Turn the whole block into another type (editor spec §6, T2).
                      ...selectionTurnInto(editor),
                    ]}
                    menuWidth={220}
                    hasChevron={false}
                  />
                  </RovingToolbar>
                </BubbleMenu>
              ))}
              <SlashMenu editor={editor} commands={inserts} />
            </>
          )}
          {/* Only the writing scrolls (tablet/desktop): its scrollbar starts below the toolbar. */}
          <div className="write-scroll" ref={setScrollElement}>
            <div className="write-document" ref={setDocumentElement}>
              <TitleFields
                editor={editor}
                title={meta.title}
                subtitle={meta.subtitle}
                isEditable={status !== 'archived'}
                onChange={patch => changeMeta(patch.title !== undefined && slugIsAuto.current ? {...patch, slug: slugify(patch.title) || meta.slug} : patch)}
              />
              <EditorContent editor={editor} />
              {editor && (
                <BlockHandle
                  editor={editor}
                  container={documentElement}
                  isEditable={status !== 'archived'}
                  onProperties={() => {
                    setPanelTab('block');
                    setIsPanelOpen(true);
                  }}
                />
              )}
            </div>
          </div>
        </VStack>

        {isDrawer && isPanelOpen && (
          // Drawer backdrop (shown below 1024px only): tap to close.
           <button type="button" className="write-side-scrim" aria-label="Close side panel" tabIndex={-1} onClick={() => setIsPanelOpen(false)} />
        )}
        {isPanelOpen && (
          <VStack gap={0} className="write-side" role="complementary" aria-label="Side panel">
            <HStack className="write-side-tabs">
              <SegmentedControl
                label="Side panel"
                value={panelTab}
                onChange={value => setPanelTab(value as PanelTab)}
                size="sm"
                layout="fill">
                <SegmentedControlItem value="guide" label="Guide" />
                <SegmentedControlItem value="block" label="Block" />
                <SegmentedControlItem value="media" label="Media" />
                <SegmentedControlItem value="settings" label="Details" />
              </SegmentedControl>
            </HStack>
            {panelTab === 'guide' ? (
              <VStack gap={0} className="write-settings">
                {editor && (
                  <SectionGuide
                    editor={editor}
                    caseStudyId={study.id}
                    sections={outline.sections}
                    active={outline.active}
                    inserts={inserts}
                    notes={notes}
                    onNoteSaved={(sectionId, body) => setNotes(current => ({...current, [sectionId]: body}))}
                    isEditable={status !== 'archived'}
                  />
                )}
              </VStack>
            ) : panelTab === 'media' ? (
              <VStack gap={0} className="write-settings">
                <MediaPanel
                  caseStudyId={study.id}
                  isEditable={status !== 'archived'}
                  onInsert={asset => editor?.chain().focus().insertContent(nodeFor(asset)).run()}
                />
              </VStack>
            ) : panelTab === 'block' ? (
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

      <HistoryDialog
        caseStudyId={study.id}
        isOpen={isHistoryOpen}
        isArchived={status === 'archived'}
        onClose={() => setIsHistoryOpen(false)}
        beforeChange={async () => {
          if (status !== 'archived') await saveNow();
        }}
      />

      {editor && (
        <ReviewDialog
          editor={editor}
          review={review}
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          onOpenDetails={() => {
            setPanelTab('settings');
            setIsPanelOpen(true);
          }}
        />
      )}

      {/* Link editor (spec A5) */}
      <Dialog isOpen={linkDialog !== null} onOpenChange={open => !open && setLinkDialog(null)} purpose="form" width={460}>
        <DialogHeader title={linkDialog?.isNew ? 'Add a link' : 'Edit link'} onOpenChange={open => !open && setLinkDialog(null)} />
        <form
          onSubmit={event => {
            event.preventDefault();
            if (linkDialog) applyLink(linkDialog);
          }}>
          <VStack gap={4} className="write-dialog-body">
            <TextInput
              label="Web address (URL)"
              description="For example: https://www.example.com or mailto:name@example.com"
              hasAutoFocus
              value={linkDialog?.href ?? ''}
              onChange={href => linkDialog && setLinkDialog({...linkDialog, href, error: undefined})}
              status={linkDialog?.error ? {type: 'error', message: linkDialog.error} : undefined}
              width="100%"
            />
            <TextInput
              label="Text to show"
              description="Leave it as it is to keep the selected text."
              value={linkDialog?.text ?? ''}
              onChange={text => linkDialog && setLinkDialog({...linkDialog, text})}
              width="100%"
            />
            <Switch label="Open in a new tab" value={linkDialog?.newTab ?? true} onChange={newTab => linkDialog && setLinkDialog({...linkDialog, newTab})} />
            <HStack gap={2} hAlign="end">
              {!linkDialog?.isNew && <Button label="Remove link" variant="destructive" onClick={() => linkDialog && applyLink(linkDialog, true)} />}
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
