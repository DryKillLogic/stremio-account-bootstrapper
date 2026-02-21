import {
  getAddonConfig as getAioStreamsConfig,
  getTemplate
} from '../../api/aioStreamsApi';
import type { AddonConfigContext } from './types';
import { getLanguageName } from '../../utils/language';
import { convertToBytes } from '../../utils/sizeConverters';

function addLanguageSpecificAddons(
  presets: any[],
  language: string,
  isDebridUser: boolean
): void {
  const cometaConfig = {
    type: 'comet',
    instanceId: 'c25',
    enabled: true,
    options: {
      name: 'Cometa',
      timeout: 15000,
      resources: ['stream'],
      url: 'https://cometa.stremx.net',
      includeP2P: !isDebridUser,
      removeTrash: false,
      scrapeDebridAccountTorrents: false,
      useMultipleInstances: false,
      mediaTypes: []
    }
  };

  const languageAddons: Record<string, any[]> = {
    'es-MX': [{ ...cometaConfig }],
    'es-ES': [
      { ...cometaConfig },
      ...(isDebridUser
        ? [
            {
              type: 'peerflix',
              instanceId: 'c7e',
              enabled: true,
              options: {
                name: 'Peerflix',
                timeout: 15000,
                resources: ['stream'],
                mediaTypes: [],
                useMultipleInstances: false,
                showTorrentLinks: false
              }
            }
          ]
        : [])
    ],
    'pt-BR': [
      {
        type: 'brazuca-torrents',
        instanceId: '0cc',
        enabled: true,
        options: {
          name: 'Brazuca Torrents',
          timeout: 15000,
          resources: ['stream']
        }
      }
    ],
    fr: [
      {
        type: 'comet',
        instanceId: '6dc',
        enabled: true,
        options: {
          name: 'CometFR',
          timeout: 15000,
          resources: ['stream'],
          url: 'https://comet.stremiofr.com',
          includeP2P: !isDebridUser,
          removeTrash: false,
          scrapeDebridAccountTorrents: false,
          useMultipleInstances: false,
          mediaTypes: []
        }
      }
    ]
  };

  if (languageAddons[language]) {
    presets.push(...languageAddons[language]);
  }
}

function getWebStreamrConfig(language: string): any {
  const baseProviders = ['multi', 'en'];

  const languageProviders: Record<string, string[]> = {
    'es-MX': ['mx'],
    'es-ES': ['es'],
    it: ['it'],
    fr: ['fr'],
    de: ['de']
  };

  const additionalProviders = languageProviders[language] || [];

  return {
    type: 'webstreamr',
    instanceId: '645',
    enabled: true,
    options: {
      name: 'WebStreamr',
      timeout: 7000,
      resources: ['stream'],
      mediaTypes: [],
      providers: [...baseProviders, ...additionalProviders],
      includeExternalUrls: false,
      showErrors: false
    }
  };
}

export async function configureAioStreams(
  presetConfig: any,
  context: AddonConfigContext
): Promise<void> {
  if (!presetConfig.aiostreams) return;

  const {
    debridEntries,
    debridServiceName,
    language,
    no4k,
    cached,
    size,
    password,
    advanced
  } = context;
  const isDebridUser = debridEntries.length > 0;

  // Fetch template
  let template: any;
  try {
    const templateType = isDebridUser ? 'debrid' : 'p2p';
    template = await getTemplate(templateType);

    if (!template) {
      delete presetConfig.aiostreams;
      return;
    }
  } catch (e) {
    console.log('Failed to fetch AIOStreams template:', e);
    delete presetConfig.aiostreams;
    return;
  }

  // Set debrid services
  const debridServices = debridEntries.map((debrid) => ({
    id: debrid.service,
    enabled: true,
    credentials: {
      apiKey: debrid.key
    }
  }));

  // Enable Torbox addon if debrid service available
  const hasTorbox = debridEntries.some((debrid) => debrid.service === 'torbox');
  const torboxAddon = template.config.presets.find(
    (preset: any) => preset.type === 'torbox-search'
  );

  if (torboxAddon) {
    torboxAddon.enabled = hasTorbox;
  }

  // Add language-specific addons
  addLanguageSpecificAddons(template.config.presets, language, isDebridUser);

  // Remove Webstreamr if it exists
  template.config.presets = template.config.presets.filter(
    (preset: any) => preset.type !== 'webstreamr'
  );

  // Add Webstreamr with language-specific providers
  const webstreamrConfig = getWebStreamrConfig(language);
  template.config.presets.push(webstreamrConfig);

  // Build config overrides
  const languagePassthrough = `/*yourLanguage*/  passthrough(slice(language(merge(cached(streams), type(streams,'p2p','http')), '${getLanguageName(language)}'), 0, 5), 'title', 'excluded')`;

  const configOverrides = {
    services: debridServices,
    preferredLanguages:
      language !== 'en'
        ? [getLanguageName(language), ...template.config.preferredLanguages]
        : template.config.preferredLanguages,
    ...(language !== 'en' && {
      includedStreamExpressions: [
        {
          expression: languagePassthrough,
          enabled: true
        }
      ]
    }),
    excludedQualities: ['CAM', 'TS', 'TC', 'SCR'],
    excludedResolutions: [
      ...(no4k ? ['2160p', '1440p'] : []),
      '360p',
      '240p',
      '144p'
    ],
    ...(size && {
      size: {
        global: {
          movies: [0, convertToBytes(size)],
          series: [0, convertToBytes(size)],
          anime: [0, convertToBytes(size)]
        }
      }
    }),
    ...(cached && { excludeUncached: true }),
    formatter: { id: 'lightgdrive' },
    tmdbAccessToken: '',
    tvdbApiKey: '',
    tmdbApiKey: advanced?.tmdbKey || '',
    ...(!advanced?.tmdbKey && {
      yearMatching: { enabled: false },
      titleMatching: { enabled: false },
      digitalReleaseFilter: { enabled: false },
      bitrate: { useMetadataRuntime: false }
    })
  };

  template = {
    ...template,
    config: { ...template.config, ...configOverrides },
    password
  };

  // Get addon config
  try {
    const aioStreamsData = await getAioStreamsConfig(template);
    if (aioStreamsData?.manifest && aioStreamsData?.transportUrl) {
      presetConfig.aiostreams.manifest = aioStreamsData.manifest;
      presetConfig.aiostreams.manifest.name =
        'AIOStreams' + (debridServiceName ? ` | ${debridServiceName}` : '');
      presetConfig.aiostreams.transportUrl = aioStreamsData.transportUrl;
    } else {
      delete presetConfig.aiostreams;
    }
  } catch (e) {
    console.log('Failed to configure AIOStreams:', e);
    delete presetConfig.aiostreams;
  }
}
