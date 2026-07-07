import { setAddonCollection, type Platform } from '../api/platformApi';
import {
  syncCollections,
  updateNuvioProfileSettings
} from './nuvioSyncService';

export interface LoadPresetServiceParams {
  addons: any[];
  key: string;
  platform?: Platform;
  collections?: any;
  profileId?: number;
  tmdbKey?: string;
}

export async function loadPresetService({
  addons,
  key,
  platform = 'stremio',
  collections = [],
  profileId = 1,
  tmdbKey
}: LoadPresetServiceParams) {
  if (!key) {
    throw new Error('No auth key provided');
  }

  const res = await setAddonCollection(platform, addons, key, profileId);
  if (!res?.result?.success) {
    throw new Error(res?.result?.error || 'Addons sync failed');
  }

  if (platform === 'nuvio') {
    await syncCollections(collections, key, profileId);

    if (tmdbKey) {
      await updateNuvioProfileSettings(tmdbKey, key, profileId);
    }
  }

  return res;
}
