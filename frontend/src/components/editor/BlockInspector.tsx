'use client';

import type {Editor} from '@tiptap/react';
import type {Node as PMNode} from '@tiptap/pm/model';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Icon} from '@astryxdesign/core/Icon';
import {Copy, Trash2} from 'lucide-react';
import {blockLabel, deleteBlock, duplicateBlock, setBlockAttrs} from './blockOps';
import {PresetGallery} from './PresetGallery';
import {INSPECTORS} from './blocks/inspectors';

/**
 * The side panel's Block tab: the selected block's name, its actions, its presets and its
 * properties (from the inspector registry, `blocks/inspectors.tsx`). Every change writes straight
 * into the document.
 */
export function BlockInspector({editor, block}: {editor: Editor; block: {name: string; pos: number; node: PMNode}}) {
  const {name, pos, node} = block;
  const setConfig = (config: unknown) => setBlockAttrs(editor, pos, {config});
  const config = node.attrs.config;
  const entry = INSPECTORS[name];

  let body: React.ReactNode = null;
  if (entry?.kind === 'config' && config) body = <entry.Inspector key={entry.keyed ? pos : undefined} config={config} onChange={setConfig} />;
  else if (entry?.kind === 'node') body = <entry.Inspector editor={editor} pos={pos} node={node} />;

  return (
    <VStack gap={6}>
      <HStack justify="between" vAlign="center" gap={2}>
        <Heading level={2} style={{fontSize: 'var(--type-headline-s-size)'}}>
          {blockLabel(name)}
        </Heading>
        <HStack gap={1}>
          <IconButton label="Duplicate block" tooltip="Duplicate" size="sm" variant="ghost" onClick={() => duplicateBlock(editor, pos)} icon={<Icon icon={Copy} size="sm" color="inherit" />} />
          <IconButton label="Delete block" tooltip="Delete" size="sm" variant="destructive" onClick={() => deleteBlock(editor, pos)} icon={<Icon icon={Trash2} size="sm" color="inherit" />} />
        </HStack>
      </HStack>
      {name === 'callout' ? (
        <PresetGallery block="callout" current={{tone: node.attrs.tone, icon: node.attrs.icon}} onApply={next => setBlockAttrs(editor, pos, {tone: next.tone, icon: next.icon})} />
      ) : (
        config && <PresetGallery block={name} current={config} onApply={setConfig} />
      )}
      {body}
      <Text type="supporting" color="secondary">
        Drag a block by its handle, or press ⌥⇧↑ or ⌥⇧↓, to move it.
      </Text>
    </VStack>
  );
}
