import {clearUntouchedHints} from '@studio/shared';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import type {StudioCaseStudy} from '@studio/shared';
import {Chapter} from '@/components/editorial/Chapter';
import {EditorialHero} from '@/components/editorial/EditorialHero';
import {CaseStudyArticle} from '@/components/caseStudy/CaseStudyArticle';
import {studioMediaUrl} from '@studio/shared';
import {EYEBROW_STYLE} from '@/theme/eyebrow';

/**
 * A case study as it reads, for its owner only. Media come from the
 * private, session-checked /studio/files route.
 */
export function StudioPreview({study, isEmbedded}: {study: StudioCaseStudy; isEmbedded: boolean}) {
  const label = [study.label, study.area].filter(Boolean).join(' · ');
  return (
    <VStack gap={0}>
      {!isEmbedded && (
        <HStack className="studio-bar preview-bar glass glass-bar" justify="between" vAlign="center" gap={4} wrap="wrap">
          <Text type="supporting" style={EYEBROW_STYLE}>
            Private preview
          </Text>
          <Button label="Back to editing" size="sm" variant="secondary" href={`/studio/case-studies/${study.id}`} />
        </HStack>
      )}
      <EditorialHero label={label || undefined} title={study.title} description={study.subtitle || study.summary} meta={study.tags} width="narrow" />
      <Chapter width="narrow" label="Case study" className="cs-article-chapter">
        {study.cover_path && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="cs-cover" src={studioMediaUrl(study.cover_path)} alt={study.thumbnail_alt} fetchPriority="high" />
        )}
        <CaseStudyArticle content={clearUntouchedHints(study.content)} />
      </Chapter>
    </VStack>
  );
}
