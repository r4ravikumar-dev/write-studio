import type {DeviceMockupConfig} from '@/lib/caseStudies/blocks';

/**
 * Device mockup geometry, shared by the renderer and the editor's composition tools (T6).
 *
 * A device's stored x/y is its centre in % of the stage, before the composition's spacing is
 * applied: on screen, x is spread out from the middle (`left = 50 + (x − 50) × spread`); y isn't.
 */
export const DEVICE_SPACING = {tight: 0.8, normal: 1, loose: 1.2} as const;
export const spreadOf = (config: Pick<DeviceMockupConfig, 'spacing'>) => DEVICE_SPACING[config.spacing] ?? 1;

/** On-screen x (% of the stage) for a stored x, and back. */
export const displayX = (x: number, spread: number) => 50 + (x - 50) * spread;
export const storedX = (left: number, spread: number) => 50 + (left - 50) / spread;

/** A device's box on the stage, in % of the stage's width (x) and height (y). */
export type DeviceBox = {left: number; right: number; top: number; bottom: number; cx: number; cy: number};

/** Measures every device on a stage from the page (rotated devices: their bounding box). */
export function measureDevices(stage: Element | null): Record<string, DeviceBox> {
  if (!stage) return {};
  const frame = stage.getBoundingClientRect();
  if (!frame.width || !frame.height) return {};
  const boxes: Record<string, DeviceBox> = {};
  stage.querySelectorAll<HTMLElement>('[data-device-id]').forEach(slot => {
    const rect = slot.getBoundingClientRect();
    const left = ((rect.left - frame.left) / frame.width) * 100;
    const right = ((rect.right - frame.left) / frame.width) * 100;
    const top = ((rect.top - frame.top) / frame.height) * 100;
    const bottom = ((rect.bottom - frame.top) / frame.height) * 100;
    boxes[slot.dataset.deviceId!] = {left, right, top, bottom, cx: (left + right) / 2, cy: (top + bottom) / 2};
  });
  return boxes;
}

/** The stage holding a device, found by its id (the inspector isn't inside the stage). */
export const stageOfDevice = (id: string | undefined) =>
  id && typeof document !== 'undefined' ? document.querySelector(`[data-device-id="${CSS.escape(id)}"]`)?.closest('.vb-stage') ?? null : null;

export const SNAP_DISTANCE = 1.5;

/**
 * Snapping (editor spec §11.3): moves `delta` so an edge or the centre of `box` lands on a guide
 * (the stage's 0 / 50 / 100 % lines, other devices' edges and centres) when within 1.5 %.
 * Returns the adjusted delta and the guide it snapped to, if any.
 */
export function snapAxis(edges: number[], targets: number[], delta: number): {delta: number; guide: number | null} {
  let best: {distance: number; shift: number; guide: number} | null = null;
  for (const edge of edges) {
    for (const target of targets) {
      const shift = target - (edge + delta);
      if (Math.abs(shift) <= SNAP_DISTANCE && (!best || Math.abs(shift) < best.distance)) best = {distance: Math.abs(shift), shift, guide: target};
    }
  }
  return best ? {delta: delta + best.shift, guide: best.guide} : {delta, guide: null};
}

export const roundPosition = (value: number) => Math.round(Math.min(100, Math.max(0, value)) * 10) / 10;
