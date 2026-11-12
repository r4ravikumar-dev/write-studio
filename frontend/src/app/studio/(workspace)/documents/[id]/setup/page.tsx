import type {Metadata} from 'next';
import {notFound, redirect} from 'next/navigation';
import {VStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {SETUP_STEPS, untitledTitle, type StudioSetup} from '@studio/shared';
import {ProjectSetup, type CopySource} from '@/components/studio/creation/ProjectSetup';
import {requireStudioUser} from '@/lib/auth/current-user';
import {getStudioCaseStudy, listStudioCaseStudies} from '@/lib/studio/queries';

export async function generateMetadata({params}: {params: Promise<{id: string}>}): Promise<Metadata> {
  const study = await getStudioCaseStudy((await params).id);
  return {title: `Set up: ${study?.title.replace(/\*/g, '').trim() || untitledTitle(study?.document_type)}`};
}

/** Continues a setup saved with "Save and finish later" (the owner's only; anyone else gets 404). */
export default async function ContinueSetupPage({params}: {params: Promise<{id: string}>}) {
  await requireStudioUser();
  const study = await getStudioCaseStudy((await params).id);
  if (!study) notFound();
  if (!study.setup_state) redirect(`/studio/documents/${study.id}/edit`);
  const state = study.setup_state;
  const initial: StudioSetup = {
    step: SETUP_STEPS.includes(state.step) ? state.step : 'start',
    start: state.start === 'blank' ? 'blank' : 'framework',
    outline: Array.isArray(state.outline) ? state.outline : [],
    document_type: study.document_type,
    metadata: study.metadata ?? {},
    project_type: study.project_type,
    title: study.title === untitledTitle(study.document_type) ? '' : study.title,
    summary: study.summary,
    role: study.role,
    team: study.team,
    timeline: study.timeline,
    platform: study.platform,
    objective: study.objective,
    challenge: study.challenge,
    template_id: study.template_id ?? 'product-ux',
    template_version: study.template_version ?? 1,
    cover_path: study.cover_path,
    cover_alt: study.thumbnail_alt,
  };
  const studies = await listStudioCaseStudies('active');
  const copySources: CopySource[] = studies
    .filter(other => !other.setup_state && other.id !== study.id)
    .map(other => ({id: other.id, title: other.title.replace(/\*/g, '').trim() || untitledTitle(other.document_type)}));
  return (
    <VStack gap={6}>
      <Heading level={1}>Continue setting up</Heading>
      <ProjectSetup id={study.id} initial={initial} copySources={copySources} />
    </VStack>
  );
}
