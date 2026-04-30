import _ from 'lodash';
import { getRequest } from '../utils/http';
import { debridServicesInfo, isValidApiKey } from '../utils/debrid';
import { isValidManifestUrl } from '../utils/url.ts';
import { setAddonCollection } from '../api/stremioApi';
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
  configureTorbox,
  configureAioStreams,
  configureHdHub
} from './addons';
import { configureMeteor } from './addons/meteor.ts';

declare const Sqrl: SquirrellyRenderer;

interface BuildPresetServiceParams {
  preset: string;
  language: string;
  extras: string[];
  customAddons: string[];
  options: string[];
  maxSize: string | number;
  advanced?: AdvancedOptions;
  debridEntries?: DebridEntry[];
  password: string;
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
    password
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
      advanced
    );
  } catch (e) {
    errors.push(`AIOMetadata: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Normalize and validate debrid services
  const validatedDebridEntries: DebridEntry[] = (debridEntries || [])
    .filter((debrid) => debrid && debrid.service && debrid.key)
    .filter((debrid) => isValidApiKey(debrid.service, debrid.key));

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
    password
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
    const mediaFusionResult = await configureMediaFusion(
      presetConfig,
      mediaFusionConfig,
      context
    );
    if (mediaFusionResult.shouldReplace && mediaFusionResult.rebuilt) {
      presetConfig = replaceAddonKey(
        presetConfig,
        'mediafusion',
        mediaFusionResult.rebuilt
      );
    }
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

    // Torbox
    configureTorbox(presetConfig, context, Sqrl);

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
    delete presetConfig.torbox;
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
    errors
  };
}

interface LoadPresetServiceParams {
  addons: any[];
  key: string;
}

export async function loadPresetService({
  addons,
  key
}: LoadPresetServiceParams) {
  if (!key) {
    throw new Error('No auth key provided');
  }

  const res = await setAddonCollection(addons, key);
  if (!res?.result?.success) {
    throw new Error(res?.result?.error || 'Sync failed');
  }

  return res;
}
