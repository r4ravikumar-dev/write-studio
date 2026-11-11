import {HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {PROJECT_TYPES, documentSections, frameworkSection, studioMediaUrl, type StudioCaseStudy} from '@studio/shared';
import {CaseStudyArticle} from '@/components/caseStudy/CaseStudyArticle';
import {Lines} from '@/components/storytelling/Lines';
import {ExportMenu} from '@/components/studio/ExportMenu';
import {EYEBROW_STYLE} from '@/theme/eyebrow';

/**
 * A case study as it reads, for its owner only (Stage 5 restyle). A calm reading page: the
 * project's label, title and subtitle, its facts (role, team, timeline, platform), the cover, the
 * summary, contents, then the story. Media come from the private, session-checked /studio/files.
 * The same page is what PDF (print) and HTML export are made from.
 */
export function StudioPreview({study, isEmbedded}: {study: StudioCaseStudy; isEmbedded: boolean}) {
  const title = study.title.trim() && study.title !== 'Untitled case study' ? study.title : 'Untitled case study';
  const eyebrow = [study.project_type ? PROJECT_TYPES[study.project_type]?.label : null, study.label, study.area].filter(Boolean).join(' · ');
  const facts = [
    ['Role', study.role],
    ['Team', study.team],
    ['Timeline', study.timeline],
    ['Platform', study.platform],
  ].filter(([, value]) => value?.trim()) as [string, string][];
  // Contents: sections with something in them, by their title (or the framework's).
  const contents = documentSections(study.content)
    .filter(section => section.state !== 'empty')
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
            <ExportMenu title={title.replace(/\*/g, '')} />
            <Button label="Back to editing" size="sm" variant="secondary" href={`/studio/case-studies/${study.id}`} />
          </HStack>
        </HStack>
      )}
      <article className="preview-page" aria-labelledby="preview-title">
        <header className="preview-head">
          {eyebrow && <p className="preview-eyebrow">{eyebrow}</p>}
          <h1 id="preview-title" className="preview-title">
            <Lines text={title} />
          </h1>
          {study.subtitle && <p className="preview-subtitle">{study.subtitle}</p>}
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
              <nav className="preview-contents" aria-label="In this case study">
                <p className="preview-contents-title">In this case study</p>
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
