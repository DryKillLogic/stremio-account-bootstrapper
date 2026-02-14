import _ from 'lodash';
import { getRequest } from '../utils/http';
import { debridServicesInfo, isValidApiKey } from '../utils/debrid';
import { isValidManifestUrl } from '../utils/url.ts';
import { setAddonCollection } from '../api/stremioApi';
import type {
  DebridEntry,
  AddonConfigContext,
  SquirrellyRenderer
} from './addons';
import {
  configureAIOLists,
  configureTorrentio,
  configurePeerflix,
  configureMediaFusion,
  configureJackettio,
  configureComet,
  configureTorrentsDB,
  configureStremThruTorz,
  configureStremThruStore,
  configureSootio,
  configureTorbox
} from './addons';

declare const Sqrl: SquirrellyRenderer;

interface BuildPresetServiceParams {
  preset: string;
  language: string;
  extras: string[];
  customAddons: string[];
  options: string[];
  maxSize: string | number;
  rpdbKey?: string;
  debridEntries?: DebridEntry[];
}

export async function buildPresetService(params: BuildPresetServiceParams) {
  const {
    preset,
    language,
    customAddons,
    extras,
    options,
    maxSize,
    rpdbKey,
    debridEntries = []
  } = params;

  const data: any = await getRequest('/preset.json');
  if (!data) throw new Error('Failed to fetch presets');

  let presetConfig: any = {};
  let no4k = options.includes('no4k');
  let cached = options.includes('cached');
  let limit = ['minimal', 'kids'].includes(preset) ? 2 : 10;
  let size = maxSize ? maxSize : '';

  const mediaFusionConfig = data.mediafusionConfig;

  // Preset
  presetConfig = _.pick(
    language === 'en'
      ? data.languages[language]
      : _.merge({}, data.languages.en, data.languages[language]),
    data.presets[preset]
  );

  // Custom addons
  if (customAddons.length > 0) {
    for (const [idx, addon] of customAddons.entries()) {
      try {
        if (!isValidManifestUrl(addon)) continue;
        const addonData: any = await getRequest(addon);
        if (addonData) {
          presetConfig[`customAddon${idx}`] = {
            transportUrl: addon,
            manifest: addonData
          };
        }
      } catch (e) {
        // ignore failed custom addon request
      }
    }
  }

  // Extras
  if (extras.length > 0) {
    extras.forEach((extra) => {
      _.merge(presetConfig, { [extra]: data.extras[extra] });
    });
  }

  // Configure AIOLists
  await configureAIOLists(presetConfig, data, preset, language, rpdbKey);

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
    preset
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

  // TorrentsDB
  configureTorrentsDB(presetConfig, context);

  // StremThru Torz
  configureStremThruTorz(presetConfig, context);

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
    configureStremThruStore(presetConfig, context);

    // Delete TPB+
    delete presetConfig.tpbplus;
  } else {
    delete presetConfig.jackettio;
    delete presetConfig.sootio;
    delete presetConfig.torbox;
  }

  console.log('PRESET CONFIG', presetConfig);
  const selectedAddons = Object.keys(presetConfig).map((k) => presetConfig[k]);

  return {
    presetConfig,
    selectedAddons,
    debridServiceName
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
