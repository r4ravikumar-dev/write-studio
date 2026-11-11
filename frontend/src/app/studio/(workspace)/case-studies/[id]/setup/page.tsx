import type {Metadata} from 'next';
import {notFound, redirect} from 'next/navigation';
import {VStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {SETUP_STEPS, type StudioSetup} from '@studio/shared';
import {ProjectSetup, type CopySource} from '@/components/studio/creation/ProjectSetup';
import {requireStudioUser} from '@/lib/auth/current-user';
import {getStudioCaseStudy, listStudioCaseStudies} from '@/lib/studio/queries';

export async function generateMetadata({params}: {params: Promise<{id: string}>}): Promise<Metadata> {
  const study = await getStudioCaseStudy((await params).id);
  return {title: `Set up: ${study?.title.replace(/\*/g, '').trim() || 'Untitled case study'}`};
}

/** Continues a setup saved with "Save and finish later" (the owner's only; anyone else gets 404). */
export default async function ContinueSetupPage({params}: {params: Promise<{id: string}>}) {
  await requireStudioUser();
  const study = await getStudioCaseStudy((await params).id);
  if (!study) notFound();
  if (!study.setup_state) redirect(`/studio/case-studies/${study.id}`);
  const state = study.setup_state;
  const initial: StudioSetup = {
    step: SETUP_STEPS.includes(state.step) ? state.step : 'start',
    start: state.start === 'blank' ? 'blank' : 'framework',
    outline: Array.isArray(state.outline) ? state.outline : [],
    project_type: study.project_type,
    title: study.title === 'Untitled case study' ? '' : study.title,
    summary: study.summary,
    role: study.role,
    team: study.team,
    timeline: study.timeline,
    platform: study.platform,
    objective: study.objective,
    challenge: study.challenge,
    framework_id: study.framework_id ?? 'product-ux',
    framework_version: study.framework_version ?? 1,
    cover_path: study.cover_path,
    cover_alt: study.thumbnail_alt,
  };
  const studies = await listStudioCaseStudies('draft');
  const copySources: CopySource[] = studies
    .filter(other => !other.setup_state && other.id !== study.id)
    .map(other => ({id: other.id, title: other.title.replace(/\*/g, '').trim() || 'Untitled case study'}));
  return (
    <VStack gap={6}>
      <Heading level={1}>Continue setting up</Heading>
      <ProjectSetup id={study.id} initial={initial} copySources={copySources} />
    </VStack>
  );
}
