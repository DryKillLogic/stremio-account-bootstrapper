import _ from 'lodash';
import { getAddonConfig as getMediaFusionConfig } from '../../api/mediafusionApi';
import { convertToBytes } from '../../utils/sizeConverters';
import { debridServicesInfo } from '../../utils/debrid';
import type { AddonConfigContext } from './types';

export async function configureMediaFusion(
  presetConfig: any,
  mediaFusionConfig: any,
  context: AddonConfigContext
): Promise<{ rebuilt?: any; shouldReplace: boolean }> {
  if (!presetConfig.mediafusion) return { shouldReplace: false };

  const { debridEntries, language, no4k, cached, size } = context;

  const prepareConfig = (config: any) => {
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
      _.pull(config.language_sorting, languagesToPrioritize[language]);
      config.language_sorting.unshift(languagesToPrioritize[language]);
    }

    if (no4k) {
      _.pull(config.selected_resolutions, '4k', '2160p', '1440p');
    }

    if (size) {
      config.max_size = convertToBytes(size);
    }
  };

  if (debridEntries.length === 0) {
    const config = _.cloneDeep(mediaFusionConfig);
    prepareConfig(config);

    const encrypted = await getMediaFusionConfig(config);
    if (encrypted) {
      presetConfig.mediafusion.transportUrl = encrypted;
      return { shouldReplace: false };
    } else {
      delete presetConfig.mediafusion;
      return { shouldReplace: false };
    }
  }

  const shouldClone = debridEntries.length >= 2;
  const baseMediaFusion = shouldClone
    ? _.cloneDeep(presetConfig.mediafusion)
    : presetConfig.mediafusion;
  const rebuilt: any = {};

  for (const debrid of debridEntries) {
    const name = shouldClone ? `mediafusion_${debrid.service}` : 'mediafusion';

    try {
      const config = _.cloneDeep(mediaFusionConfig);
      prepareConfig(config);

      config.streaming_provider = {
        service: debrid.service,
        token: debrid.key,
        enable_watchlist_catalogs: false,
        download_via_browser: false,
        only_show_cached_streams: cached
      };

      const encrypted = await getMediaFusionConfig(config);
      if (!encrypted) {
        if (!shouldClone) {
          delete presetConfig.mediafusion;
          return { shouldReplace: false };
        }
        continue;
      }

      if (shouldClone) {
        const entryManifest = _.cloneDeep(baseMediaFusion.manifest || {});
        if (entryManifest?.name) {
          entryManifest.name += ` | ${debridServicesInfo[debrid.service]?.name || debrid.service}`;
        }
        rebuilt[name] = {
          transportUrl: encrypted,
          manifest: entryManifest
        };
      } else {
        presetConfig.mediafusion.transportUrl = encrypted;
        if (presetConfig.mediafusion.manifest?.name) {
          presetConfig.mediafusion.manifest.name += ` | ${debridServicesInfo[debrid.service]?.name || debrid.service}`;
        }
      }
    } catch {
      if (!shouldClone) {
        delete presetConfig.mediafusion;
        return { shouldReplace: false };
      }
      continue;
    }
  }

  return shouldClone
    ? { rebuilt, shouldReplace: true }
    : { shouldReplace: false };
}
