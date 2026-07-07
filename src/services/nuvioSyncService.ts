import {
  pushCollections,
  pullProfileSettingsBlob,
  pushProfileSettingsBlob
} from '../api/platformApi';

export async function syncCollections(
  collections: any[],
  key: string,
  profileId: number
): Promise<void> {
  const collectionsSyncRes = await pushCollections(collections, key, profileId);
  if (!collectionsSyncRes?.result?.success) {
    throw new Error(
      collectionsSyncRes?.result?.error || 'Collections sync failed'
    );
  }
}

export async function updateNuvioProfileSettings(
  tmdbKey: string,
  authKey: string,
  profileId: number
): Promise<void> {
  const currentSettings = await pullProfileSettingsBlob(authKey, profileId);
  const existing = currentSettings?.result?.settings_json || {
    version: 3,
    features: {}
  };

  existing.features = {
    ...existing.features,
    tmdb_settings: {
      tmdb_enabled: { type: 'boolean', value: true },
      tmdb_api_key: { type: 'string', value: tmdbKey }
    }
  };

  const settingsRes = await pushProfileSettingsBlob(
    existing,
    authKey,
    profileId
  );
  if (!settingsRes?.result?.success) {
    throw new Error(
      settingsRes?.result?.error || 'User profile settings sync failed'
    );
  }
}
