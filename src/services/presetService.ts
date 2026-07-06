import _ from 'lodash';
import { getRequest } from '../utils/http';
import { debridServicesInfo, isValidApiKey } from '../utils/debrid';
import { isValidManifestUrl } from '../utils/url.ts';
import {
  setAddonCollection,
  pushCollections,
  type Platform
} from '../api/platformApi';
import type {
  DebridEntry,
  AddonConfigContext,
  SquirrellyRenderer,
  AdvancedOptions
} from './addons';
import {
  configureAioMetadata,
  configureTorrentio,
  configurePeerflix,
  configureMediaFusion,
  configureJackettio,
  configureComet,
  configureTorrentsDB,
  configureStremThruTorz,
  configureStremThruStore,
  configureSootio,
  configureAioStreams,
  configureHdHub,
  configureEasynews
} from './addons';
import { configureMeteor } from './addons/meteor.ts';
import { LOCALE_MESSAGES } from '../locales';

declare const Sqrl: SquirrellyRenderer;

function translateCollections(collections: any[], language: string): any[] {
  const lang = language.split('-')[0] || 'en';
  const messages = LOCALE_MESSAGES[lang] ?? LOCALE_MESSAGES['en'] ?? {};
  return collections.map((collection) => {
    const key =
      'nuvio_collection_' +
      (collection.title as string).toLowerCase().replace(/\s+/g, '_');
    if (messages[key]) {
      return { ...collection, title: messages[key] };
    }
    return collection;
  });
}

interface BuildPresetServiceParams {
  preset: string;
  language: string;
  extras: string[];
  customAddons: string[];
  options: string[];
  maxSize: string | number;
  advanced?: AdvancedOptions;
  debridEntries?: DebridEntry[];
  easynewsEntry?: { username: string; password: string };
  password: string;
  platform?: Platform;
}

export async function buildPresetService(params: BuildPresetServiceParams) {
  const {
    preset,
    language,
    customAddons,
    extras,
    options,
    maxSize,
    advanced = {},
    debridEntries = [],
    easynewsEntry,
    password,
    platform = 'stremio'
  } = params;

  const errors: string[] = [];

  const data: any = await getRequest('/preset.json');
  if (!data) throw new Error('Failed to fetch presets');

  const mediaFusionConfig = data.mediafusionConfig;
  let presetConfig: any = {};
  let no4k = options.includes('no4k');
  let cached = options.includes('cached');
  let kids = options.includes('kids');
  let limit = preset === 'minimal' ? 5 : 10;
  let size = maxSize ? maxSize : '';
  let presetKeys = data.presets[preset];

  let presetData =
    language === 'en'
      ? data.languages[language]
      : _.merge({}, data.languages.en, data.languages[language]);

  // Region-specific addons
  const languageAddons: Record<string, string[]> = {
    'es-ES': ['cometa', 'peerflix'],
    'es-MX': ['cometa', 'notorrent'],
    'pt-BR': ['brazucatorrents']
  };

  if (preset !== 'allinone' && preset !== 'factory' && preset !== 'http_only') {
    const addons = languageAddons[language];
    if (addons) {
      presetKeys = [...presetKeys, ...addons];
    }
  }

  // Easynews addon
  if (
    preset !== 'allinone' &&
    easynewsEntry?.username &&
    easynewsEntry?.password
  ) {
    presetKeys = [...presetKeys, 'easynews'];
  }

  // Remove cinemeta on Nuvio
  if (platform === 'nuvio') {
    presetKeys = presetKeys.filter((key: string) => key !== 'cinemeta');
  }

  // Preset config
  presetConfig = _.pick(presetData, presetKeys);

  // Custom addons
  if (customAddons.length > 0) {
    for (const [idx, addon] of customAddons.entries()) {
      try {
        if (!addon?.trim()) {
          continue;
        }

        if (!isValidManifestUrl(addon)) {
          errors.push(
            `Custom addon ${idx + 1}: Invalid manifest URL (${addon})`
          );
          continue;
        }
        const addonData: any = await getRequest(addon);
        if (addonData) {
          presetConfig[`customAddon${idx}`] = {
            transportUrl: addon,
            manifest: addonData
          };
        } else {
          errors.push(
            `Custom addon ${idx + 1}: No data received from ${addon}`
          );
        }
      } catch (e) {
        errors.push(
          `Custom addon ${idx + 1}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
  }

  // Extras
  if (extras.length > 0) {
    extras.forEach((extra) => {
      _.merge(presetConfig, { [extra]: data.extras[extra] });
    });
  }

  // Configure AIOMetadata
  try {
    await configureAioMetadata(
      presetConfig,
      data,
      language,
      kids,
      password,
      advanced,
      platform
    );
  } catch (e) {
    errors.push(`AIOMetadata: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Normalize and validate debrid services
  const validatedDebridEntries: DebridEntry[] = (debridEntries || []).filter(
    (debrid) => {
      if (!debrid || !debrid.service) return false;
      return debrid.key && isValidApiKey(debrid.service, debrid.key);
    }
  );

  // Debrid service name for manifest suffixes
  const debridServiceName =
    validatedDebridEntries.length > 0
      ? validatedDebridEntries
          .map(
            (debrid) =>
              debridServicesInfo[debrid.service]?.name || debrid.service
          )
          .join(' + ')
      : '';

  // Create context for addon configurations
  const context: AddonConfigContext = {
    language,
    no4k,
    cached,
    limit,
    size,
    debridEntries: validatedDebridEntries,
    debridServiceName,
    preset,
    password,
    easynewsEntry
  };

  // Helper function to replace an addon key with cloned entries while maintaining order
  const replaceAddonKey = (
    config: any,
    oldKey: string,
    newEntries: Record<string, any>
  ) => {
    const entries = Object.entries(config);
    const newConfig: any = {};

    for (const [key, value] of entries) {
      if (key === oldKey) {
        // Replace the old key with all new entries
        Object.assign(newConfig, newEntries);
      } else {
        newConfig[key] = value;
      }
    }

    return newConfig;
  };

  // Torrentio
  const torrentioResult = configureTorrentio(presetConfig, context, Sqrl);
  if (torrentioResult.shouldReplace && torrentioResult.rebuilt) {
    presetConfig = replaceAddonKey(
      presetConfig,
      'torrentio',
      torrentioResult.rebuilt
    );
  }

  // MediaFusion
  try {
    await configureMediaFusion(presetConfig, mediaFusionConfig, context);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
    delete presetConfig.mediafusion;
  }

  // Peerflix
  const peerflixResult = configurePeerflix(presetConfig, context, Sqrl);
  if (peerflixResult.shouldReplace && peerflixResult.rebuilt) {
    presetConfig = replaceAddonKey(
      presetConfig,
      'peerflix',
      peerflixResult.rebuilt
    );
  }

  // Comet
  configureComet(presetConfig, context);

  // Cometa
  configureComet(presetConfig, context, 'cometa');

  // TorrentsDB
  configureTorrentsDB(presetConfig, context);

  // StremThru Torz
  configureStremThruTorz(presetConfig, context);

  // Meteor
  const meteorResult = configureMeteor(presetConfig, context);
  if (meteorResult.shouldReplace && meteorResult.rebuilt) {
    presetConfig = replaceAddonKey(
      presetConfig,
      'meteor',
      meteorResult.rebuilt
    );
  }

  // AIOStreams
  try {
    await configureAioStreams(presetConfig, context);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
    delete presetConfig.aiostreams;
  }

  // Brazuca Torrents
  const brazucaTorrentsResult = configureTorrentio(
    presetConfig,
    context,
    Sqrl,
    'brazucatorrents'
  );
  if (brazucaTorrentsResult.shouldReplace && brazucaTorrentsResult.rebuilt) {
    presetConfig = replaceAddonKey(
      presetConfig,
      'brazucatorrents',
      brazucaTorrentsResult.rebuilt
    );
  }

  // HdHub
  configureHdHub(presetConfig, context);

  // Easynews
  configureEasynews(presetConfig, context);

  // Sootio HTTP
  configureSootio(presetConfig, context, 'http');

  // Configure or remove debrid-only addons
  if (validatedDebridEntries.length > 0) {
    // Jackettio
    const jackettioResult = configureJackettio(presetConfig, context);
    if (jackettioResult.shouldReplace && jackettioResult.rebuilt) {
      presetConfig = replaceAddonKey(
        presetConfig,
        'jackettio',
        jackettioResult.rebuilt
      );
    }

    // Sootio
    configureSootio(presetConfig, context);

    // StremThru Store
    try {
      const stremthruStoreResult = await configureStremThruStore(
        presetConfig,
        context
      );
      if (stremthruStoreResult.shouldReplace && stremthruStoreResult.rebuilt) {
        presetConfig = replaceAddonKey(
          presetConfig,
          'stremthrustore',
          stremthruStoreResult.rebuilt
        );
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
      delete presetConfig.stremthrustore;
    }

    // Delete TPB+
    delete presetConfig.tpbplus;
  } else {
    delete presetConfig.jackettio;
    delete presetConfig.sootio;
  }

  console.log('PRESET CONFIG', presetConfig);
  const selectedAddons = Object.keys(presetConfig).map((k) => presetConfig[k]);

  if (selectedAddons.length === 0 && errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  // If there are errors, we include them in the response
  if (errors.length > 0) {
    const errorMessage = errors.join('\n');
    console.warn('Errors during preset configuration:', errorMessage);
  }

  return {
    presetConfig,
    selectedAddons,
    debridServiceName,
    collections: kids
      ? []
      : translateCollections(data.nuvioCollectionsConfig || [], language),
    errors
  };
}

interface LoadPresetServiceParams {
  addons: any[];
  key: string;
  platform?: Platform;
  collections?: any;
  profileId?: number;
}

export async function loadPresetService({
  addons,
  key,
  platform = 'stremio',
  collections = [],
  profileId = 1
}: LoadPresetServiceParams) {
  if (!key) {
    throw new Error('No auth key provided');
  }

  const res = await setAddonCollection(platform, addons, key, profileId);
  if (!res?.result?.success) {
    throw new Error(res?.result?.error || 'Addons sync failed');
  }

  if (platform === 'nuvio') {
    const collectionsSyncRes = await pushCollections(
      collections,
      key,
      profileId
    );
    if (!collectionsSyncRes?.result?.success) {
      throw new Error(
        collectionsSyncRes?.result?.error || 'Collections sync failed'
      );
    }
  }

  return res;
}
