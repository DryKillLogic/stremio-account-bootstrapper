import {
  getAddonConfig as getAioStreamsConfig,
  getTemplate
} from '../../api/aioStreamsApi';
import type { AddonConfigContext } from './types';
import { getLanguageName } from '../../utils/language';
import { convertToBytes } from '../../utils/sizeConverters';
import { merge } from 'lodash';
import { applyTemplateConditionals } from '../../utils/templateConditionals';

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
    instanceId: '48e',
    enabled: true,
    options: {
      name: 'WebStreamrMBG',
      timeout: 7000,
      resources: ['stream'],
      url: 'https://87d6a6ef6b58-webstreamrmbg.baby-beamup.club',
      mediaTypes: [],
      providers: [...baseProviders, ...additionalProviders],
      includeExternalUrls: false,
      showErrors: false
    }
  };
}

// Extract default values
function extractInputDefaults(inputs: any[]): Record<string, any> {
  const defaults: Record<string, any> = {};
  if (!Array.isArray(inputs)) return defaults;
  for (const input of inputs) {
    if (
      !input ||
      typeof input !== 'object' ||
      typeof input.id !== 'string' ||
      !input.id.trim()
    )
      continue;
    if (input.type === 'subsection' && Array.isArray(input.subOptions)) {
      defaults[input.id] = extractInputDefaults(input.subOptions);
    } else if ('default' in input) {
      defaults[input.id] = input.default;
    }
  }
  return defaults;
}

// Call AIOStreams template processing logic to apply conditionals
function processTemplate(
  template: any,
  props: Record<string, any>,
  selectedSvcs: string[]
): any {
  const inputDefaults = extractInputDefaults(template?.metadata?.inputs || []);
  const mergedProps = merge({}, inputDefaults, props);
  return applyTemplateConditionals(template, mergedProps, selectedSvcs);
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
    template = await getTemplate();

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

  // Process template
  const processedTemplate = processTemplate(
    template,
    {
      languages: [getLanguageName(language)],
      includeAddon: {
        subtitleLanguages: ['disabled']
      },
      passthrough: {
        language: getLanguageName(language),
        languagePin: language !== 'en' ? true : false
      },
      torboxTier: 'nonPro',
      ...(no4k ? { deviceExclude: ['4k'] } : {})
    },
    debridServices.map((svc) => svc.id)
  );

  template = processedTemplate;

  // Add language-specific addons
  addLanguageSpecificAddons(template.config.presets, language, isDebridUser);

  // Remove Webstreamr if it exists and add it with language-specific providers
  template.config.presets = template.config.presets.filter(
    (preset: any) => preset.type !== 'webstreamr'
  );
  const webstreamrConfig = getWebStreamrConfig(language);
  template.config.presets.push(webstreamrConfig);

  // Build config overrides
  const configOverrides = {
    services: debridServices,
    excludedQualities: ['CAM', 'TS', 'TC', 'SCR'],
    excludedResolutions: ['360p', '240p', '144p'],
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
    formatter: {
      id: 'lightgdrive'
    },
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
