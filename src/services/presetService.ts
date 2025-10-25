import _ from 'lodash';
import * as Sqrl from 'squirrelly';
import { getRequest } from '../utils/http';
import { getAddonConfig as getAioListsConfig } from '../api/aiolistsApi';
import { getAddonConfig as getMediaFusionConfig } from '../api/mediafusionApi';
import { getAddonConfig as getStremthruConfig } from '../api/stremthruApi';
import { updateTransportUrl } from '../utils/transportUrl';
import { debridServicesInfo, type DebridService } from '../utils/debrid';
import { convertToBytes, convertToMegabytes } from '../utils/sizeConverters';
import { setAddonCollection } from '../api/stremioApi';

interface BuildPresetServiceParams {
  preset: string;
  language: string;
  extras: string[];
  options: string[];
  maxSize: string | number;
  rpdbKey?: string;
  debridService?: string;
  debridApiKey?: string | null;
  isDebridApiKeyValid?: boolean;
}

export async function buildPresetService(params: BuildPresetServiceParams) {
  const {
    preset,
    language,
    extras,
    options,
    maxSize,
    rpdbKey,
    debridService,
    debridApiKey,
    isDebridApiKeyValid
  } = params;

  const data: any = await getRequest('/preset.json');
  if (!data) throw new Error('Failed to fetch presets');

  let presetConfig: any = {};
  let no4k = options.includes('no4k');
  let cached = options.includes('cached');
  let limit = ['minimal', 'kids'].includes(preset) ? 2 : 10;
  let size = maxSize ? maxSize : '';

  const mediaFusionConfig = data.mediafusionConfig;
  const aiolistsConfig =
    preset === 'kids' ? data.aiolistsKidsConfig : data.aiolistsConfig;

  // Language specific addons
  if (language === 'es-MX') {
    data.presets[preset].push('subdivx');
  }

  // Preset
  presetConfig = _.pick(
    language === 'en'
      ? data.languages[language]
      : _.merge({}, data.languages.en, data.languages[language]),
    data.presets[preset]
  );

  // Extras
  if (extras.length > 0) {
    extras.forEach((extra) => {
      _.merge(presetConfig, { [extra]: data.extras[extra] });
    });
  }

  // AIOLists options
  aiolistsConfig.config.tmdbLanguage =
    language === 'es-MX' || language === 'es-ES' ? 'es' : language;
  aiolistsConfig.config = _.merge(
    {},
    aiolistsConfig.config,
    language !== 'en' ? aiolistsConfig[language] : {}
  );

  if (rpdbKey) {
    aiolistsConfig.config.rpdbApiKey = rpdbKey;
    aiolistsConfig.config.isConnected = aiolistsConfig.config.isConnected || {};
    aiolistsConfig.config.isConnected.rpdb = true;
  }

  // AIOLists request
  if (presetConfig.aiolists) {
    try {
      const aiolistsData = await getAioListsConfig(aiolistsConfig);
      if (aiolistsData && aiolistsData.manifest && aiolistsData.transportUrl) {
        presetConfig.aiolists.manifest = aiolistsData.manifest;
        presetConfig.aiolists.transportUrl = aiolistsData.transportUrl;
      } else {
        presetConfig = _.omit(presetConfig, 'aiolists');
      }
    } catch (e) {
      presetConfig = _.omit(presetConfig, 'aiolists');
    }
  }

  let debridServiceName = '';
  let torrentioConfig = '';
  let peerflixConfig = '';

  // Debrid config
  if (isDebridApiKeyValid) {
    debridServiceName = debridServicesInfo[
      debridService as keyof typeof debridServicesInfo
    ].name as DebridService;

    // Torrentio
    if (presetConfig.torrentio) {
      torrentioConfig = `|sort=qualitysize|debridoptions=${cached ? 'nodownloadlinks,' : ''}nocatalog|${debridService}=${debridApiKey}`;
    }

    // Comet
    if (presetConfig.comet) {
      updateTransportUrl({
        presetConfig,
        serviceKey: 'comet',
        manifestNameSuffix: debridServiceName,
        updateData: (data: any) => ({
          ...data,
          debridApiKey,
          debridService,
          cachedOnly: cached
        })
      });
    }

    // MediaFusion
    if (presetConfig.mediafusion) {
      if (
        presetConfig.mediafusion.manifest &&
        presetConfig.mediafusion.manifest.name
      ) {
        presetConfig.mediafusion.manifest.name += ` | ${debridServiceName}`;
      }
      mediaFusionConfig.streaming_provider = {
        service: debridService,
        token: debridApiKey,
        enable_watchlist_catalogs: false,
        download_via_browser: false,
        only_show_cached_streams: cached
      };
    }

    // TorrentsDB
    if (presetConfig.torrentsdb) {
      updateTransportUrl({
        presetConfig,
        serviceKey: 'torrentsdb',
        manifestNameSuffix: debridServiceName,
        updateData: (data: any) => ({
          ...data,
          sort: 'qualitysize',
          [debridService as string]: debridApiKey
        })
      });
    }

    // Jackettio
    if (presetConfig.jackettio) {
      updateTransportUrl({
        presetConfig,
        serviceKey: 'jackettio',
        updateData: (data: any) => ({
          ...data,
          debridApiKey,
          debridId: debridService,
          hideUncached: cached,
          qualities: no4k ? _.pull(data.qualities, 2160) : data.qualities
        })
      });
    }

    // StremThru Torz
    if (presetConfig.stremthrutorz) {
      const stremthrutorzDebridService: Record<string, string> = {
        realdebrid: 'rd',
        alldebrid: 'ad',
        premiumize: 'pm',
        debridlink: 'dl',
        torbox: 'tb'
      };

      updateTransportUrl({
        presetConfig,
        serviceKey: 'stremthrutorz',
        manifestNameSuffix: debridServiceName,
        updateData: (data: any) => ({
          ...data,
          stores: [
            {
              c: stremthrutorzDebridService[debridService as string],
              t: debridApiKey
            }
          ],
          cached
        })
      });
    }

    // Sootio
    if (presetConfig.sootio) {
      if (debridService !== 'debridlink' && debridService !== 'easydebrid') {
        const sootioDebridService: Record<string, string> = {
          realdebrid: 'RealDebrid',
          alldebrid: 'AllDebrid',
          premiumize: 'Premiumize',
          torbox: 'TorBox'
        };

        updateTransportUrl({
          presetConfig,
          serviceKey: 'sootio',
          manifestNameSuffix: debridServiceName,
          updateData: (data: any) => ({
            ...data,
            DebridServices: [
              {
                provider: sootioDebridService[debridService as string],
                apiKey: debridApiKey
              }
            ],
            maxSize: size ? size : 200,
            DebridProvider: sootioDebridService[debridService as string],
            DebridApiKey: debridApiKey
          }),
          base64: false
        });
      } else {
        presetConfig = _.omit(presetConfig, 'sootio');
      }
    }

    // Peerflix
    if (presetConfig.peerflix) {
      if (debridService !== 'easydebrid') {
        peerflixConfig = `%7Cdebridoptions=nocatalog${cached ? ',nodownloadlinks' : ''}%7C${debridService}=${debridApiKey}`;
      } else {
        presetConfig = _.omit(presetConfig, 'peerflix');
      }
    }

    // Torbox
    if (debridService === 'torbox' && presetConfig.torbox) {
      presetConfig.torbox.transportUrl = Sqrl.render(
        presetConfig.torbox.transportUrl,
        {
          transportUrl: debridApiKey
        }
      );
    } else {
      presetConfig = _.omit(presetConfig, 'torbox');
    }

    // StreamAsia
    if (presetConfig.streamasia && debridService !== 'easydebrid') {
      const streamAsiaDebridService: Record<string, string> = {
        realdebrid: 'Real Debrid',
        alldebrid: 'AllDebrid',
        premiumize: 'Premiumize',
        debridlink: 'Debrid-Link',
        torbox: 'Torbox'
      };

      updateTransportUrl({
        presetConfig,
        serviceKey: 'streamasia',
        manifestNameSuffix: debridServiceName,
        updateData: (data: any) => ({
          ...data,
          debridConfig: [
            {
              debridProvider: streamAsiaDebridService[debridService as string],
              token: debridApiKey
            }
          ]
        })
      });
    }

    // StremThru Store
    if (presetConfig.stremthrustore) {
      updateTransportUrl({
        presetConfig,
        serviceKey: 'stremthrustore',
        manifestNameSuffix: debridServiceName,
        updateData: (data: any) => ({
          ...data,
          store_name: debridService,
          store_token: debridApiKey
        })
      });

      try {
        const manifestStremthruStoreUserData = await getStremthruConfig(
          presetConfig.stremthrustore.transportUrl
        );

        if (manifestStremthruStoreUserData) {
          presetConfig.stremthrustore.manifest = manifestStremthruStoreUserData;
        }
      } catch (error) {
        presetConfig = _.omit(presetConfig, 'stremthrustore');
      }
    }

    // Remove TPB+
    presetConfig = _.omit(presetConfig, 'tpbplus');
  } else {
    presetConfig = _.omit(presetConfig, 'jackettio');
    presetConfig = _.omit(presetConfig, 'sootio');
    presetConfig = _.omit(presetConfig, 'torbox');
  }

  // Torrrentio
  if (presetConfig.torrentio) {
    presetConfig.torrentio.transportUrl = Sqrl.render(
      presetConfig.torrentio.transportUrl,
      {
        transportUrl: torrentioConfig,
        no4k: no4k ? '4k,' : '',
        limit,
        maxSize: size ? `|sizefilter=${size}GB` : ''
      }
    );
    if (debridServiceName) {
      presetConfig.torrentio.manifest.name += ` | ${debridServiceName}`;
    }
  }

  // Comet
  if (presetConfig.comet) {
    updateTransportUrl({
      presetConfig,
      serviceKey: 'comet',
      updateData: (data: any) => ({
        ...data,
        maxResultsPerResolution: limit,
        maxSize: size ? convertToBytes(size) : 0,
        resolutions: {
          ...data.resolutions,
          r2160p: no4k ? false : true
        }
      })
    });
  }

  // MediaFusion
  if (presetConfig.mediafusion) {
    if (no4k) {
      _.pull(mediaFusionConfig.selected_resolutions, '4k', '2160p', '1440p');
    }

    const languagesToPrioritize: Record<string, string> = {
      'es-MX': 'Latino',
      'es-ES': 'Spanish',
      'pt-BR': 'Portuguese',
      fr: 'French',
      it: 'Italian',
      de: 'German',
      nl: 'Dutch'
    };

    if (languagesToPrioritize[language]) {
      _.pull(
        mediaFusionConfig.language_sorting,
        languagesToPrioritize[language]
      );
      mediaFusionConfig.language_sorting.unshift(
        languagesToPrioritize[language]
      );
    }

    if (size) mediaFusionConfig.max_size = convertToBytes(size);

    const encryptedMediaFusionUserData =
      await getMediaFusionConfig(mediaFusionConfig);
    if (encryptedMediaFusionUserData) {
      presetConfig.mediafusion.transportUrl = encryptedMediaFusionUserData;
    } else {
      presetConfig = _.omit(presetConfig, 'mediafusion');
    }
  }

  // TorrentsDB
  if (presetConfig.torrentsdb) {
    updateTransportUrl({
      presetConfig,
      serviceKey: 'torrentsdb',
      updateData: (data: any) => ({
        ...data,
        sizefilter: size ? convertToMegabytes(size) : '',
        qualityfilter: [
          ...data.qualityfilter,
          ...(no4k
            ? ['4k', 'brremux', 'hdrall', 'dolbyvisionwithhdr', 'dolbyvision']
            : [])
        ]
      })
    });
  }

  // Peerflix
  if (presetConfig.peerflix) {
    if (debridService !== '' && debridService !== 'easydebrid') {
      presetConfig.peerflix.transportUrl = Sqrl.render(
        presetConfig.peerflix.transportUrl,
        {
          transportUrl: peerflixConfig,
          no4k: no4k ? ',remux4k,4k,micro4k' : '',
          sort: debridService ? ',size-desc' : ',seed-desc'
        }
      );
      if (debridServiceName) {
        presetConfig.peerflix.manifest.name += ` | ${debridServiceName}`;
      }
    }
  }

  const selectedAddons = Object.keys(presetConfig).map((k) => presetConfig[k]);

  return {
    presetConfig,
    selectedAddons,
    debridServiceName,
    torrentioConfig,
    peerflixConfig
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
