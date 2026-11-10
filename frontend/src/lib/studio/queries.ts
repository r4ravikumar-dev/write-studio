import 'server-only';
import type {StudioCaseStudy, StudioCaseStudyCard, StudioStatus} from '@studio/shared';
import {ApiError, api} from '@/lib/api/express';

/** The signed-in user's case studies (the API returns only theirs). */
export async function listStudioCaseStudies(status?: StudioStatus): Promise<StudioCaseStudyCard[]> {
  return (await api<{studies: StudioCaseStudyCard[]}>(`/api/app/case-studies${status ? `?status=${status}` : ''}`, {auth: true})).studies;
}

/** One of the user's case studies, or null (unknown and other people's look the same). */
export async function getStudioCaseStudy(id: string): Promise<StudioCaseStudy | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    return (await api<{study: StudioCaseStudy}>(`/api/app/case-studies/${id}`, {auth: true})).study;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
