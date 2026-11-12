/**
 * Privacy-safe analytics event taxonomy and payload sanitisation (Phase 7: Quality, Beta and Iteration).
 * Specification: docs/multi-vertical-master-plan.json §analytics_specification.
 *
 * INVARIANT: Never collect document body text, headings, private notes, uploaded media content,
 * full asset paths, signed URLs, credentials, or personal identifiable information (PII).
 */

export const STUDIO_ANALYTICS_EVENTS = [
  'template_library_opened',
  'template_searched',
  'template_previewed',
  'template_selected',
  'document_wizard_started',
  'document_created',
  'section_added',
  'section_reordered',
  'guidance_opened',
  'block_inserted',
  'block_inspector_opened',
  'preview_opened',
  'review_opened',
  'export_started',
  'export_completed',
  'document_archived',
  'returning_creator',
] as const;

export type StudioAnalyticsEvent = (typeof STUDIO_ANALYTICS_EVENTS)[number];

export const ALLOWED_EVENT_PROPERTIES = [
  'document_type',
  'template_id',
  'template_version',
  'block_id',
  'block_family',
  'export_format',
  'success_or_failure',
  'coarse_performance_duration',
] as const;

export type AllowedEventProperty = (typeof ALLOWED_EVENT_PROPERTIES)[number];

export type StudioEventProperties = Partial<Record<AllowedEventProperty, string | number | boolean>>;

const ALLOWED_SET = new Set<string>(ALLOWED_EVENT_PROPERTIES);

/**
 * Keywords and fragments that must never appear in telemetry payloads.
 */
export const PROHIBITED_PROPERTY_PATTERNS = [
  /\bcontent\b/i,
  /\btext\b/i,
  /\bbody\b/i,
  /\bnote(s)?\b/i,
  /\bprompt(s)?\b/i,
  /\burl\b/i,
  /\bpath\b/i,
  /\bsrc\b/i,
  /\btoken\b/i,
  /\bsecret\b/i,
  /\bkey\b/i,
  /\bpassword\b/i,
  /\bemail\b/i,
  /\bcredential(s)?\b/i,
];

/**
 * Validates that an event name is part of the approved studio taxonomy.
 */
export function isAllowedEventName(name: string): name is StudioAnalyticsEvent {
  return (STUDIO_ANALYTICS_EVENTS as readonly string[]).includes(name);
}

/**
 * Pure sanitizer that filters event properties strictly against ALLOWED_EVENT_PROPERTIES
 * and rejects any payload attempting to pass unauthorized, sensitive, or document content data.
 */
export function sanitizeAnalyticsPayload(
  eventName: string,
  rawProperties?: Record<string, unknown>,
): {event: StudioAnalyticsEvent; properties: StudioEventProperties} | null {
  if (!isAllowedEventName(eventName)) {
    return null;
  }

  const sanitized: StudioEventProperties = {};
  if (!rawProperties || typeof rawProperties !== 'object') {
    return {event: eventName, properties: sanitized};
  }

  for (const [key, value] of Object.entries(rawProperties)) {
    // 1. Strict allowlist check: drop any key not in ALLOWED_EVENT_PROPERTIES
    if (!ALLOWED_SET.has(key)) {
      continue;
    }

    // 2. Strict type check: only allow primitive strings, numbers, or booleans
    const valType = typeof value;
    if (valType !== 'string' && valType !== 'number' && valType !== 'boolean') {
      continue;
    }

    // 3. String length bounding: drop strings > 100 characters to prevent accidental content leakage
    if (valType === 'string') {
      const strVal = (value as string).trim();
      if (strVal.length > 100) {
        continue;
      }
      sanitized[key as AllowedEventProperty] = strVal;
    } else {
      sanitized[key as AllowedEventProperty] = value as number | boolean;
    }
  }

  return {event: eventName, properties: sanitized};
}

/**
 * Evaluates whether a creator's session meets the activation candidate definition:
 * "A user creates a document, adds meaningful content in at least three relevant sections,
 * inserts at least one relevant block where appropriate, and opens private preview."
 */
export function isActivationCandidate(metrics: {
  completedSectionsCount: number;
  hasInsertedBlock: boolean;
  hasOpenedPreview: boolean;
}): boolean {
  return metrics.completedSectionsCount >= 3 && metrics.hasInsertedBlock && metrics.hasOpenedPreview;
}
