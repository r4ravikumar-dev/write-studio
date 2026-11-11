import type {Metadata} from 'next';
import {Text} from '@astryxdesign/core/Text';
import type {StudioAsset} from '@studio/shared';
import {MediaManager} from '@/components/studio/MediaManager';
import {api, errorMessage} from '@/lib/api/express';
import {requireStudioUser} from '@/lib/auth/current-user';

export const metadata: Metadata = {title: 'Media library'};

export default async function StudioMediaPage() {
  await requireStudioUser();
  let assets: StudioAsset[];
  try {
    assets = (await api<{assets: StudioAsset[]}>('/api/app/assets', {auth: true})).assets;
  } catch (error) {
    return <Text role="alert">{errorMessage(error, 'We couldn’t load your media library. Reload the page to try again.')}</Text>;
  }
  return <MediaManager assets={assets} />;
}
