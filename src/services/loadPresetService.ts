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
  profileId?: number | 'all';
  profileIds?: number[];
  tmdbKey?: string;
}

export async function loadPresetService({
  addons,
  key,
  platform = 'stremio',
  collections = [],
  profileId = 1,
  profileIds = [],
  tmdbKey
}: LoadPresetServiceParams) {
  if (!key) {
    throw new Error('No auth key provided');
  }

  const targetProfileIds = profileId === 'all' ? profileIds : [profileId];

  if (targetProfileIds.length === 0) {
    throw new Error('No profiles available for sync');
  }

  let res;
  for (const targetProfileId of targetProfileIds) {
    res = await setAddonCollection(platform, addons, key, targetProfileId);
    if (!res?.result?.success) {
      throw new Error(
        res?.result?.error ||
          `Addons sync failed for profile ${targetProfileId}`
      );
    }

    if (platform === 'nuvio') {
      await syncCollections(collections, key, targetProfileId);

      if (tmdbKey) {
        await updateNuvioProfileSettings(tmdbKey, key, targetProfileId);
      }
    }
  }

  return res;
}
