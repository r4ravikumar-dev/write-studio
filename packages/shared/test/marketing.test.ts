import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CURRENT_TEMPLATES,
  DOCUMENT_TYPES,
  MARKETING_TEMPLATES,
  TEMPLATE_CATEGORIES,
  getMarketingTemplate,
  getMarketingTemplatesByCategory,
  isAvailableMarketingSlug,
  templateIdToSlug,
  templateSlugToId,
} from '../src/index';

test('every document type has a corresponding marketing template', () => {
  const docTypes = Object.keys(DOCUMENT_TYPES);
  for (const docType of docTypes) {
    const matchingMarketing = MARKETING_TEMPLATES.find(t => t.documentType === docType);
    assert.ok(matchingMarketing, `Missing marketing template for document type: ${docType}`);
  }
});

test('every marketing template slug is unique and resolves to a valid current template', () => {
  const slugs = new Set<string>();
  for (const template of MARKETING_TEMPLATES) {
    assert.ok(!slugs.has(template.slug), `Duplicate slug: ${template.slug}`);
    slugs.add(template.slug);

    const activeInCurrent = CURRENT_TEMPLATES.some(c => c.id === template.templateId);
    assert.ok(activeInCurrent, `Template ID ${template.templateId} not found in CURRENT_TEMPLATES`);

    assert.ok(isAvailableMarketingSlug(template.slug), `Slug ${template.slug} should be available`);
    assert.ok(template.name.trim().length > 0, `Template ${template.slug} must have a name`);
    assert.ok(template.description.trim().length > 0, `Template ${template.slug} must have a description`);
    assert.ok(template.audience.length > 0, `Template ${template.slug} must have target audiences`);
    assert.ok(template.suggestedSections.length > 0, `Template ${template.slug} must have suggested sections`);
    assert.ok(template.marketingTitle.includes('Write Studio'), `SEO title must include brand`);
  }
});

test('category filtering correctly matches defined template categories', () => {
  const categories = Object.keys(TEMPLATE_CATEGORIES) as (keyof typeof TEMPLATE_CATEGORIES)[];
  for (const cat of categories) {
    const list = getMarketingTemplatesByCategory(cat);
    assert.ok(list.length > 0, `Category ${cat} has no marketing templates`);
    for (const item of list) {
      assert.equal(item.category, cat);
    }
  }
});

test('slug and ID conversion helpers work consistently', () => {
  assert.equal(templateSlugToId('developer-documentation'), 'developer-docs');
  assert.equal(templateIdToSlug('developer-docs'), 'developer-documentation');

  assert.equal(templateSlugToId('feature-specification'), 'feature-spec');
  assert.equal(templateIdToSlug('feature-spec'), 'feature-specification');

  assert.equal(templateSlugToId('ux-case-study'), 'product-ux');
  assert.equal(templateIdToSlug('product-ux'), 'ux-case-study');
});

test('marketing outlines match the real template sections', () => {
  for (const template of MARKETING_TEMPLATES) {
    const real = CURRENT_TEMPLATES.find(c => c.id === template.templateId);
    assert.ok(real, template.slug);
    assert.deepEqual(template.suggestedSections, real.sections.map(section => section.title));
  }
});
