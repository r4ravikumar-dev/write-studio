'use client';

/**
 * Insert usage for Smart Insert's "Recently used" and "Frequently used" (editor spec §8.3, D4):
 * per browser, item ids only (no content, file names, case study ids or URLs). If storage is
 * unavailable the sections simply don't show.
 */
const KEY = 'studio.insert.usage';
const MONTH = 30 * 24 * 60 * 60 * 1000;

type Usage = Record<string, {count: number; last: string; recent?: string[]}>;

function read(): Usage {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? '{}');
    return raw && typeof raw === 'object' ? (raw as Usage) : {};
  } catch {
    return {};
  }
}

export function recordInsert(id: string) {
  try {
    const usage = read();
    const now = new Date().toISOString();
    const entry = usage[id] ?? {count: 0, last: now};
    // Count only uses within the last 30 days.
    const count = Date.now() - Date.parse(entry.last) > MONTH ? 1 : entry.count + 1;
    usage[id] = {count, last: now};
    window.localStorage.setItem(KEY, JSON.stringify(usage));
  } catch {
    // A preference only.
  }
}

/** The last `limit` distinct items inserted, newest first. */
export function recentInserts(limit = 5): string[] {
  return Object.entries(read())
    .sort((a, b) => Date.parse(b[1].last) - Date.parse(a[1].last))
    .slice(0, limit)
    .map(([id]) => id);
}

/** The most inserted items in the last 30 days (used at least twice), most first. */
export function frequentInserts(limit = 5, exclude: string[] = []): string[] {
  const since = Date.now() - MONTH;
  return Object.entries(read())
    .filter(([id, entry]) => !exclude.includes(id) && entry.count >= 2 && Date.parse(entry.last) >= since)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([id]) => id);
}
