import {cache} from 'react';
import 'server-only';
import type {StudioCaseStudy, StudioCaseStudyCard, StudioStatus} from '@studio/shared';
import {ApiError, api} from '@/lib/api/express';

/**
 * The signed-in user's documents (the API returns only theirs). `active` is everything that isn't
 * archived: drafts, in progress and ready for review.
 */
export async function listStudioCaseStudies(status?: StudioStatus | 'active'): Promise<StudioCaseStudyCard[]> {
  return (await api<{documents: StudioCaseStudyCard[]}>(`/api/app/documents${status ? `?status=${status}` : ''}`, {auth: true})).documents;
}

/**
 * One of the user's case studies, or null (unknown and other people's look the same).
 * Memoised per request, so a page's title (generateMetadata) and body share one fetch.
 */
export const getStudioCaseStudy = cache(async function getStudioCaseStudy(id: string): Promise<StudioCaseStudy | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    return (await api<{document: StudioCaseStudy}>(`/api/app/documents/${id}`, {auth: true})).document;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
});
