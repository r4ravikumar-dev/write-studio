import {STUDIO_PATH} from '../auth';

/**
 * Attribute rules (block contract B3): a small, dependency-free way to say what a stored value may
 * be, so the server can clean what the browser sends. Every rule:
 *
 *   - returns the value unchanged when it is valid (cleaning a valid document changes nothing),
 *   - otherwise returns a safe replacement (the default, a shortened string, a clamped number, or
 *     `DROP` to remove the key) and records an issue: where, and which rule, never the value
 *     itself (issues may be logged, and document content must never be).
 *
 * Cleaning is idempotent: cleaning a cleaned value changes nothing (an offline test checks this
 * for every block's fixtures).
 */
export const DROP = Symbol('drop');

export type Issue = {path: string; rule: string};

export type Rule<T = unknown> = {
  /** The cleaned value, or DROP to leave the key out. */
  clean(value: unknown, path: string, issues: Issue[]): T | typeof DROP;
  /** What a missing key means (for documentation and `isDefault`). */
  fallback?: () => T;
};

const issue = (issues: Issue[], path: string, rule: string) => issues.push({path, rule});

/** Text up to `max` characters. Longer text is shortened; anything else becomes the fallback. */
export function str(max: number, fallback = ''): Rule<string> {
  return {
    fallback: () => fallback,
    clean(value, path, issues) {
      if (typeof value !== 'string') {
        issue(issues, path, 'not text');
        return fallback;
      }
      if (value.length > max) {
        issue(issues, path, `longer than ${max}`);
        return value.slice(0, max);
      }
      return value;
    },
  };
}

/** Text matching a pattern (ids, CSS values, language names). Anything else becomes the fallback. */
export function pattern(re: RegExp, max: number, fallback = ''): Rule<string> {
  return {
    fallback: () => fallback,
    clean(value, path, issues) {
      if (typeof value === 'string' && value.length <= max && re.test(value)) return value;
      issue(issues, path, 'not in the allowed form');
      return fallback;
    },
  };
}

/** One of a fixed set of values. */
export function oneOf<const T extends string | number>(values: readonly T[], fallback: T): Rule<T> {
  return {
    fallback: () => fallback,
    clean(value, path, issues) {
      if ((values as readonly unknown[]).includes(value)) return value as T;
      issue(issues, path, 'not one of the allowed values');
      return fallback;
    },
  };
}

/** A finite number in a range (clamped), optionally a whole number. */
export function num(min: number, max: number, fallback: number, {integer = false} = {}): Rule<number> {
  return {
    fallback: () => fallback,
    clean(value, path, issues) {
      if (typeof value !== 'number' || !Number.isFinite(value) || (integer && !Number.isInteger(value))) {
        issue(issues, path, integer ? 'not a whole number' : 'not a number');
        return fallback;
      }
      if (value < min || value > max) {
        issue(issues, path, `outside ${min}–${max}`);
        return Math.min(max, Math.max(min, value));
      }
      return value;
    },
  };
}

export function bool(fallback = false): Rule<boolean> {
  return {
    fallback: () => fallback,
    clean(value, path, issues) {
      if (typeof value === 'boolean') return value;
      issue(issues, path, 'not true or false');
      return fallback;
    },
  };
}

/** `null`, or a value the inner rule accepts. */
export function nullable<T>(rule: Rule<T>): Rule<T | null> {
  return {
    fallback: () => null,
    clean(value, path, issues) {
      return value === null ? null : rule.clean(value, path, issues);
    },
  };
}

/** Leaves the key out when it is missing or invalid (optional fields of a config). */
export function optional<T>(rule: Rule<T>): Rule<T> {
  return {
    clean(value, path, issues) {
      if (value === undefined) return DROP;
      const before = issues.length;
      const cleaned = rule.clean(value, path, issues);
      return issues.length > before ? DROP : cleaned;
    },
  };
}

/** A list of items, each cleaned by `item`, at most `max` long (extra items are dropped). */
export function list<T>(item: Rule<T>, max: number): Rule<T[]> {
  return {
    fallback: () => [],
    clean(value, path, issues) {
      if (!Array.isArray(value)) {
        issue(issues, path, 'not a list');
        return [];
      }
      if (value.length > max) issue(issues, path, `more than ${max} items`);
      const out: T[] = [];
      value.slice(0, max).forEach((entry, index) => {
        const cleaned = item.clean(entry, `${path}[${index}]`, issues);
        if (cleaned !== DROP) out.push(cleaned);
      });
      return out;
    },
  };
}

export type Shape = Record<string, Rule>;

/**
 * An object with known keys. Unknown keys are dropped (and reported); missing keys stay missing,
 * so an older stored object isn't padded out with defaults (renderers merge defaults themselves).
 */
export function shape(fields: Shape): Rule<Record<string, unknown>> {
  return {
    fallback: () => ({}),
    clean(value, path, issues) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        issue(issues, path, 'not an object');
        return {};
      }
      return cleanFields(value as Record<string, unknown>, fields, path, issues);
    },
  };
}

export function cleanFields(value: Record<string, unknown>, fields: Shape, path: string, issues: Issue[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    const rule = fields[key];
    const at = path ? `${path}.${key}` : key;
    if (!rule) {
      issue(issues, at, 'unknown attribute');
      continue;
    }
    if (entry === undefined) continue;
    const cleaned = rule.clean(entry, at, issues);
    if (cleaned !== DROP) out[key] = cleaned;
  }
  return out;
}

// ---- Rules shared by many blocks ------------------------------------------------------------------

/** A link a reader can follow: https, http, mailto, tel, or a path / anchor on this site. */
export function isSafeHref(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.length > 2000 || /\s/.test(value)) return false;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  if (value.startsWith('#')) return true;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(value)?.[1]?.toLowerCase();
  return scheme === 'https' || scheme === 'http' || scheme === 'mailto' || scheme === 'tel';
}

/** A followable link, or the fallback (empty). */
export const href = (fallback = ''): Rule<string> => ({
  fallback: () => fallback,
  clean(value, path, issues) {
    if (value === '' || isSafeHref(value)) return value as string;
    issue(issues, path, 'not a safe link');
    return fallback;
  },
});

/**
 * A private media path, `{owner}/{workspace}/{document|library}/{file}`. Whether it is the
 * owner's own is checked separately, with the owner and workspace (`studioDraftProblems`).
 */
export const mediaPath = (fallback: string | null = ''): Rule<string | null> => ({
  fallback: () => fallback,
  clean(value, path, issues) {
    if (value === '' || value === null) return value;
    if (typeof value === 'string' && STUDIO_PATH.test(value)) return value;
    issue(issues, path, 'not a private media path');
    return fallback;
  },
});

/** A CSS value set by the editor (colours as tokens, sizes, weights): nothing that can break out. */
export const cssValue = pattern(/^[-#\w.%(), ]+$/, 80, '');

/** Ids of items inside a block (letters and digits). */
export const itemId = pattern(/^[A-Za-z0-9_-]{1,40}$/, 40, '');

/** A media reference inside a block's config (`MediaRef`). */
export const mediaRef = shape({
  path: mediaPath(''),
  kind: oneOf(['image', 'video'] as const, 'image'),
  mime: str(120),
  width: nullable(num(0, 100000, 0)),
  height: nullable(num(0, 100000, 0)),
  alt: str(500),
  caption: str(500),
  focus: pattern(/^[a-z %0-9.]{1,30}$/, 30, 'center'),
});
