'use client';

import {useSyncExternalStore} from 'react';

/**
 * Which devices are selected inside a device composition (editor spec §11.1), shared by the
 * canvas (the block's node view) and the inspector, which live in different parts of the page.
 * Device ids are unique, so one list serves every composition; each reads only its own ids.
 * Also holds the Snap switch (on by default, for this browser tab).
 */
type State = {ids: readonly string[]; snap: boolean};
let state: State = {ids: [], snap: true};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function setSelectedDevices(ids: readonly string[]) {
  if (ids.length === state.ids.length && ids.every((id, index) => id === state.ids[index])) return;
  state = {...state, ids: [...ids]};
  emit();
}
export function setSnap(snap: boolean) {
  state = {...state, snap};
  emit();
}
export const selectedDevices = () => state.ids;

/** The selection and Snap, re-rendering when either changes. */
export function useDeviceSelection() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}
