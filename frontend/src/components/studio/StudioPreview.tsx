import {HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {
  PROJECT_TYPES,
  DOCUMENT_TYPES,
  getTemplate,
  documentNoun,
  documentSections,
  isUntitledTitle,
  untitledTitle,
  frameworkSection,
  hasContent,
  studioMediaUrl,
  type StudioCaseStudy,
} from '@studio/shared';
import {CaseStudyArticle} from '@/components/caseStudy/CaseStudyArticle';
import {Lines} from '@/components/storytelling/Lines';
import {ExportMenu} from '@/components/studio/ExportMenu';
import {EYEBROW_STYLE} from '@/theme/eyebrow';

/**
 * A case study or professional document as it reads, for its owner only (Stage 5 restyle).
 * Renders according to its presentation profile (editorial, technical, product, changelog, procedure).
 * Media come from the private, session-checked /studio/files.
 * The same page is what PDF (print) and HTML export are made from.
 */
export function StudioPreview({study, isEmbedded}: {study: StudioCaseStudy; isEmbedded: boolean}) {
  const noun = documentNoun(study.document_type);
  const title = study.title.trim() && !isUntitledTitle(study.title) ? study.title : untitledTitle(study.document_type);
  const eyebrow = [study.project_type ? PROJECT_TYPES[study.project_type]?.label : null, study.label, study.area].filter(Boolean).join(' · ');

  const docTypeInfo = DOCUMENT_TYPES[study.document_type];
  const presentation = docTypeInfo?.presentation ?? 'editorial';
  const template = getTemplate(study.template_id, study.template_version);

  // Template-aware facts
  const templateFacts: [string, string][] = (template?.metadataFields ?? [])
    .map(field => {
      const val = study.metadata?.[field.key];
      if (val === undefined || val === null || val === '') return null;
      return [field.label, String(val).trim()] as [string, string];
    })
    .filter((entry): entry is [string, string] => Boolean(entry && entry[1]));

  const legacyFacts = [
    ['Role', study.role],
    ['Team', study.team],
    ['Timeline', study.timeline],
    ['Platform', study.platform],
  ].filter(([, value]) => value?.trim()) as [string, string][];

  const facts = templateFacts.length > 0 ? templateFacts : legacyFacts;

  // Presentation-specific header badges
  const meta = (study.metadata ?? {}) as Record<string, unknown>;
  const badges: {key: string; label: string; className: string; status?: string}[] = [];

  if (presentation === 'product') {
    if (meta.status) {
      const statusStr = String(meta.status).trim();
      badges.push({
        key: 'status',
        label: statusStr,
        className: 'preview-badge preview-badge-status',
        status: statusStr.toLowerCase().replace(/\s+/g, '-'),
      });
    }
    const releaseTarget = meta.target_release ?? meta.target_quarter;
    if (releaseTarget) {
      badges.push({
        key: 'release',
        label: String(releaseTarget).trim(),
        className: 'preview-badge preview-badge-meta',
      });
    }
  } else if (presentation === 'changelog') {
    if (meta.version) {
      badges.push({
        key: 'version',
        label: String(meta.version).trim(),
        className: 'preview-badge preview-badge-version',
      });
    }
    if (meta.release_date) {
      badges.push({
        key: 'date',
        label: String(meta.release_date).trim(),
        className: 'preview-badge preview-badge-date',
      });
    }
    if (meta.release_type) {
      badges.push({
        key: 'type',
        label: String(meta.release_type).trim(),
        className: 'preview-badge preview-badge-meta',
      });
    }
  } else if (presentation === 'technical') {
    if (meta.decision_id) {
      badges.push({
        key: 'id',
        label: String(meta.decision_id).trim(),
        className: 'preview-badge preview-badge-id',
      });
    }
    if (meta.status) {
      const statusStr = String(meta.status).trim();
      badges.push({
        key: 'status',
        label: statusStr,
        className: 'preview-badge preview-badge-status',
        status: statusStr.toLowerCase().replace(/\s+/g, '-'),
      });
    }
    if (meta.target_runtime) {
      badges.push({
        key: 'runtime',
        label: String(meta.target_runtime).trim(),
        className: 'preview-badge preview-badge-meta',
      });
    }
  } else if (presentation === 'procedure') {
    if (meta.procedure_id) {
      badges.push({
        key: 'id',
        label: String(meta.procedure_id).trim(),
        className: 'preview-badge preview-badge-id',
      });
    }
    if (meta.effective_date) {
      badges.push({
        key: 'effective',
        label: `Effective: ${String(meta.effective_date).trim()}`,
        className: 'preview-badge preview-badge-date',
      });
    }
    if (meta.review_frequency) {
      badges.push({
        key: 'frequency',
        label: `Review: ${String(meta.review_frequency).trim()}`,
        className: 'preview-badge preview-badge-meta',
      });
    }
  }

  // Contents: the sections the page shows (written in, whatever their status), by their title (or the framework's).
  const contents = documentSections(study.content)
    .filter(section => section.title.trim() || section.body.some(hasContent))
    .map(section => ({id: section.id, name: section.title || frameworkSection(section.key)?.title || ''}))
    .filter(section => section.name && section.id);

  return (
    <div className="preview">
      {!isEmbedded && (
        <HStack className="studio-bar preview-bar glass glass-bar" justify="between" vAlign="center" gap={4} wrap="wrap">
          <Text type="supporting" style={EYEBROW_STYLE}>
            Private preview
          </Text>
          <HStack gap={2} vAlign="center">
            <ExportMenu title={title.replace(/\*/g, '')} study={study} />
            <Button label="Back to editing" size="sm" variant="secondary" href={`/studio/documents/${study.id}/edit`} />
          </HStack>
        </HStack>
      )}
      <article className="preview-page" data-presentation={presentation} aria-labelledby="preview-title">
        <header className="preview-head">
          {eyebrow && <p className="preview-eyebrow">{eyebrow}</p>}
          <h1 id="preview-title" className="preview-title">
            <Lines text={title} />
          </h1>
          {study.subtitle && <p className="preview-subtitle">{study.subtitle}</p>}
          {badges.length > 0 && (
            <div className="preview-badges">
              {badges.map(b => (
                <span key={b.key} className={b.className} data-status={b.status}>
                  {b.label}
                </span>
              ))}
            </div>
          )}
          {facts.length > 0 && (
            <dl className="preview-facts">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </header>
        {study.cover_path && (
          <figure className="preview-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={studioMediaUrl(study.cover_path)} alt={study.thumbnail_alt} fetchPriority="high" />
          </figure>
        )}
        {(study.summary || contents.length > 2) && (
          <div className="preview-intro">
            {study.summary && <p className="preview-summary">{study.summary}</p>}
            {contents.length > 2 && (
              <nav className="preview-contents" aria-label={`In this ${noun}`}>
                <p className="preview-contents-title">In this {noun}</p>
                <ol>
                  {contents.map(section => (
                    <li key={section.id}>
                      <a href={`#section-${section.id}`}>{section.name}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </div>
        )}
        <div className="preview-body">
          <CaseStudyArticle content={study.content} />
        </div>
      </article>
    </div>
  );
}
