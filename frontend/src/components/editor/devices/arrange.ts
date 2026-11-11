import {blockItemId, duplicateDevice, type Device, type DeviceMockupConfig} from '@/lib/caseStudies/blocks';
import {displayX, roundPosition, spreadOf, storedX, type DeviceBox} from '@/components/caseStudy/deviceGeometry';

/**
 * Composition tools for device mockups (editor spec §11.2, T6). Pure functions: each takes the
 * block's config and the selected device ids and returns the new config, so one tool = one change
 * = one undo. Positions stay plain percentages. Boxes (`measureDevices`) are the devices' on-screen
 * boxes; without them a device is treated as a point at its centre.
 */
type Config = DeviceMockupConfig;
export type AlignEdge = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom';

const withDevices = (config: Config, update: (device: Device) => Device, ids: readonly string[], layoutChange = true): Config => ({
  ...config,
  ...(layoutChange ? {preset: 'custom' as const} : {}),
  devices: config.devices.map(device => (ids.includes(device.id) ? update(device) : device)),
});

/** A selection grown to whole groups: picking one grouped device picks its group. */
export function withGroups(config: Config, ids: readonly string[]): string[] {
  const groups = new Set(config.devices.filter(device => ids.includes(device.id) && device.groupId).map(device => device.groupId));
  return config.devices.filter(device => ids.includes(device.id) || (device.groupId && groups.has(device.groupId))).map(device => device.id);
}

function boxOf(device: Device, boxes: Record<string, DeviceBox>, spread: number): DeviceBox {
  const box = boxes[device.id];
  if (box) return box;
  const cx = displayX(device.x, spread);
  return {left: cx, right: cx, top: device.y, bottom: device.y, cx, cy: device.y};
}

/** Moves a device by an on-screen offset (% of the stage). Locked devices stay put. */
function moveBy(device: Device, dx: number, dy: number, spread: number): Device {
  if (device.locked) return device;
  return {...device, x: roundPosition(storedX(displayX(device.x, spread) + dx, spread)), y: roundPosition(device.y + dy)};
}

/** Align edges or centres: to each other (2+), or to the stage (1). */
export function alignDevices(config: Config, ids: readonly string[], boxes: Record<string, DeviceBox>, edge: AlignEdge): Config {
  const spread = spreadOf(config);
  const chosen = config.devices.filter(device => ids.includes(device.id) && !device.locked);
  if (!chosen.length) return config;
  const all = chosen.map(device => boxOf(device, boxes, spread));
  const single = chosen.length === 1;
  const target = {
    left: single ? 0 : Math.min(...all.map(box => box.left)),
    right: single ? 100 : Math.max(...all.map(box => box.right)),
    hcenter: single ? 50 : (Math.min(...all.map(box => box.left)) + Math.max(...all.map(box => box.right))) / 2,
    top: single ? 0 : Math.min(...all.map(box => box.top)),
    bottom: single ? 100 : Math.max(...all.map(box => box.bottom)),
    vcenter: single ? 50 : (Math.min(...all.map(box => box.top)) + Math.max(...all.map(box => box.bottom))) / 2,
  }[edge];
  return withDevices(
    config,
    device => {
      const box = boxOf(device, boxes, spread);
      const value = {left: box.left, right: box.right, hcenter: box.cx, top: box.top, bottom: box.bottom, vcenter: box.cy}[edge];
      const horizontal = edge === 'left' || edge === 'right' || edge === 'hcenter';
      return moveBy(device, horizontal ? target - value : 0, horizontal ? 0 : target - value, spread);
    },
    chosen.map(device => device.id),
  );
}

/** Equal space between centres, keeping the first and last where they are (3+ devices). */
export function distributeDevices(config: Config, ids: readonly string[], boxes: Record<string, DeviceBox>, axis: 'x' | 'y'): Config {
  const spread = spreadOf(config);
  const chosen = config.devices.filter(device => ids.includes(device.id) && !device.locked);
  if (chosen.length < 3) return config;
  const centre = (device: Device) => (axis === 'x' ? boxOf(device, boxes, spread).cx : boxOf(device, boxes, spread).cy);
  const sorted = [...chosen].sort((a, b) => centre(a) - centre(b));
  const first = centre(sorted[0]);
  const step = (centre(sorted[sorted.length - 1]) - first) / (sorted.length - 1);
  const shift = new Map(sorted.map((device, index) => [device.id, first + step * index - centre(device)]));
  return withDevices(config, device => moveBy(device, axis === 'x' ? shift.get(device.id)! : 0, axis === 'y' ? shift.get(device.id)! : 0, spread), sorted.map(device => device.id));
}

/** Nudge by an on-screen amount (arrow keys: 1 %, with Shift 5 %). */
export function nudgeDevices(config: Config, ids: readonly string[], dx: number, dy: number): Config {
  const spread = spreadOf(config);
  return withDevices(config, device => moveBy(device, dx, dy, spread), ids);
}

/** Layer order. Front/back jump to the top or bottom; forward/backward swap with the neighbour. */
export function reorderDevices(config: Config, ids: readonly string[], how: 'front' | 'back' | 'forward' | 'backward'): Config {
  // Work on a clean 0…n−1 order so swaps are always one step.
  const order = [...config.devices].sort((a, b) => a.z - b.z).map(device => device.id);
  const chosen = order.filter(id => ids.includes(id));
  if (!chosen.length) return config;
  let next = order;
  if (how === 'front') next = [...order.filter(id => !ids.includes(id)), ...chosen];
  else if (how === 'back') next = [...chosen, ...order.filter(id => !ids.includes(id))];
  else {
    next = [...order];
    const step = how === 'forward' ? 1 : -1;
    const indices = chosen.map(id => next.indexOf(id));
    for (const index of how === 'forward' ? [...indices].reverse() : indices) {
      const target = index + step;
      if (target < 0 || target >= next.length || ids.includes(next[target])) continue;
      [next[index], next[target]] = [next[target], next[index]];
    }
  }
  return {...config, devices: config.devices.map(device => ({...device, z: next.indexOf(device.id) + 1}))};
}

export function groupDevices(config: Config, ids: readonly string[]): Config {
  if (ids.length < 2) return config;
  const groupId = blockItemId('g');
  return withDevices(config, device => ({...device, groupId}), ids, false);
}

export function ungroupDevices(config: Config, ids: readonly string[]): Config {
  return withDevices(config, device => ({...device, groupId: undefined}), ids, false);
}

export function lockDevices(config: Config, ids: readonly string[], locked: boolean): Config {
  return withDevices(config, device => ({...device, locked}), ids, false);
}

/** Copies of the selected devices, on top, nudged so both show. Returns the copies' ids. */
export function duplicateDevices(config: Config, ids: readonly string[]): {config: Config; ids: string[]} {
  let z = Math.max(0, ...config.devices.map(device => device.z));
  const copies = config.devices.filter(device => ids.includes(device.id)).map(device => duplicateDevice(device, (z += 1)));
  return {config: {...config, preset: 'custom', devices: [...config.devices, ...copies]}, ids: copies.map(device => device.id)};
}

export function removeDevices(config: Config, ids: readonly string[]): Config {
  const devices = config.devices.filter(device => !ids.includes(device.id));
  return devices.length ? {...config, preset: 'custom', devices} : config;
}

export function isGrouped(config: Config, ids: readonly string[]) {
  return config.devices.some(device => ids.includes(device.id) && device.groupId);
}
