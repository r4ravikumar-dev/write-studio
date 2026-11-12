/**
 * Offline tests for privacy-safe analytics taxonomy and payload sanitisation.
 * Specification: docs/multi-vertical-master-plan.json §analytics_specification.
 * Run: npx tsx packages/shared/test/analytics.test.ts
 */
import assert from 'node:assert/strict';
import {
  STUDIO_ANALYTICS_EVENTS,
  ALLOWED_EVENT_PROPERTIES,
  isAllowedEventName,
  sanitizeAnalyticsPayload,
  isActivationCandidate,
} from '../src/index';

let passed = 0;
const check = (name: string, run: () => void) => {
  run();
  passed += 1;
  console.log(`PASS ${name}`);
};

check('all 17 master plan events are registered in the analytics taxonomy', () => {
  assert.equal(STUDIO_ANALYTICS_EVENTS.length, 17);
  for (const event of [
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
  ]) {
    assert.ok(isAllowedEventName(event), `event: ${event}`);
  }
  assert.equal(isAllowedEventName('unregistered_custom_event'), false);
  assert.equal(isAllowedEventName('track_keystroke'), false);
});

check('sanitizer rejects unregistered event names', () => {
  const result = sanitizeAnalyticsPayload('unregistered_event', {document_type: 'developer_documentation'});
  assert.equal(result, null);
});

check('sanitizer retains allowed telemetry properties', () => {
  const result = sanitizeAnalyticsPayload('template_selected', {
    document_type: 'developer_documentation',
    template_id: 'developer-docs',
    template_version: 1,
    success_or_failure: true,
    coarse_performance_duration: 120,
  });

  assert.ok(result);
  assert.equal(result.event, 'template_selected');
  assert.deepEqual(result.properties, {
    document_type: 'developer_documentation',
    template_id: 'developer-docs',
    template_version: 1,
    success_or_failure: true,
    coarse_performance_duration: 120,
  });
});

check('sanitizer strictly drops prohibited document body, text, notes, and credentials', () => {
  const result = sanitizeAnalyticsPayload('document_created', {
    document_type: 'technical_design_document',
    template_id: 'technical-design',
    // Prohibited content fields:
    body: 'Secret architecture discussion',
    text: 'Confidential client data',
    notes: 'Private author scratchpad',
    url: 'https://staging.internal/signed-token?secret=abc',
    token: 'jwt.token.here',
    password: 'my-password',
    credentials: {key: 'val'},
  });

  assert.ok(result);
  assert.equal(result.event, 'document_created');
  assert.deepEqual(result.properties, {
    document_type: 'technical_design_document',
    template_id: 'technical-design',
  });
  assert.equal('body' in result.properties, false);
  assert.equal('text' in result.properties, false);
  assert.equal('notes' in result.properties, false);
  assert.equal('url' in result.properties, false);
  assert.equal('token' in result.properties, false);
  assert.equal('password' in result.properties, false);
  assert.equal('credentials' in result.properties, false);
});

check('sanitizer drops strings exceeding 100 characters to prevent accidental text injection', () => {
  const longString = 'a'.repeat(150);
  const result = sanitizeAnalyticsPayload('export_completed', {
    export_format: 'markdown',
    document_type: longString, // attempted injection into allowed field
  });

  assert.ok(result);
  assert.equal('document_type' in result.properties, false);
  assert.equal(result.properties.export_format, 'markdown');
});

check('activation candidate evaluation matches master plan criteria', () => {
  // Candidate activation: 3+ completed sections, >=1 inserted block, preview opened
  assert.equal(
    isActivationCandidate({
      completedSectionsCount: 3,
      hasInsertedBlock: true,
      hasOpenedPreview: true,
    }),
    true,
  );

  // Missing sections
  assert.equal(
    isActivationCandidate({
      completedSectionsCount: 2,
      hasInsertedBlock: true,
      hasOpenedPreview: true,
    }),
    false,
  );

  // Missing inserted block
  assert.equal(
    isActivationCandidate({
      completedSectionsCount: 4,
      hasInsertedBlock: false,
      hasOpenedPreview: true,
    }),
    false,
  );

  // Missing preview
  assert.equal(
    isActivationCandidate({
      completedSectionsCount: 5,
      hasInsertedBlock: true,
      hasOpenedPreview: false,
    }),
    false,
  );
});

console.log(`\n${passed}/${passed} passed`);
