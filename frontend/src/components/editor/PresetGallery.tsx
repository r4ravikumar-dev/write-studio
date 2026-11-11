'use client';

import {VStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {EYEBROW_STYLE} from '@/theme/eyebrow';
import {BLOCK_PRESETS, applyPreset, isPresetActive, type SketchShape} from './presets';

/** A preset's schematic: rectangles drawn with theme colours (decorative; the label names it). */
function Sketch({shapes}: {shapes: SketchShape[]}) {
  return (
    <svg viewBox="0 0 64 40" className="preset-sketch" aria-hidden="true" focusable="false">
      {shapes.map(([kind, x, y, w, h], index) => (
        <rect key={index} x={x} y={y} width={w} height={h} rx={kind === 'p' || kind === 'd' ? 2 : 1} data-kind={kind} />
      ))}
    </svg>
  );
}

/**
 * Layout presets for a block (Stage 4): one click sets the layout, keeping the block's pictures
 * and text. The chosen one is marked; any later change in the inspector simply unmarks it.
 */
export function PresetGallery({
  block,
  current,
  onApply,
}: {
  block: string;
  current: Record<string, unknown>;
  onApply: (next: Record<string, unknown>) => void;
}) {
  const presets = BLOCK_PRESETS[block];
  if (!presets?.length) return null;
  return (
    <VStack gap={3}>
      <Text type="supporting" style={EYEBROW_STYLE}>
        Presets
      </Text>
      <div className="preset-grid" role="group" aria-label="Layout presets">
        {presets.map(preset => {
          const isActive = isPresetActive(preset, current);
          return (
            <button
              key={preset.id}
              type="button"
              className="preset-card"
              aria-pressed={isActive}
              title={preset.description}
              onClick={() => onApply(applyPreset(preset, current))}>
              <Sketch shapes={preset.sketch} />
              <span className="preset-label t-web-label-lg-medium">{preset.label}</span>
              <span className="sr-only">: {preset.description}</span>
            </button>
          );
        })}
      </div>
    </VStack>
  );
}
