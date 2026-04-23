import _ from 'lodash';
import { getAddonConfig as getMediaFusionConfig } from '../../api/mediafusionApi';
import { convertToBytes } from '../../utils/sizeConverters';
import { debridServicesInfo } from '../../utils/debrid';
import type { AddonConfigContext } from './types';
import { getLanguageName } from '../../utils/language';

export async function configureMediaFusion(
  presetConfig: any,
  mediaFusionConfig: any,
  context: AddonConfigContext
): Promise<{ rebuilt?: any; shouldReplace: boolean; errors?: string[] }> {
  if (!presetConfig.mediafusion) return { shouldReplace: false };

  const { debridEntries, language, no4k, cached, size } = context;

  const prepareConfig = (config: any) => {
    if (language !== 'en') {
      _.pull(config.language_sorting, getLanguageName(language));
      config.language_sorting.unshift(getLanguageName(language));
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

    try {
      const encrypted = await getMediaFusionConfig(config);
      if (encrypted) {
        presetConfig.mediafusion.transportUrl = encrypted;
        return { shouldReplace: false };
      } else {
        delete presetConfig.mediafusion;
        throw new Error(
          'Failed to get MediaFusion configuration - invalid response'
        );
      }
    } catch (e) {
      delete presetConfig.mediafusion;
      throw new Error(
        `Failed to configure MediaFusion: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  const shouldClone = debridEntries.length >= 2;
  const baseMediaFusion = shouldClone
    ? _.cloneDeep(presetConfig.mediafusion)
    : presetConfig.mediafusion;
  const rebuilt: any = {};
  const errors: string[] = [];

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
      const serviceName =
        debridServicesInfo[debrid.service]?.name || debrid.service;

      if (!encrypted) {
        const errorMsg = `No configuration returned for ${serviceName}`;
        if (!shouldClone) {
          delete presetConfig.mediafusion;
          throw new Error(`MediaFusion: ${errorMsg}`);
        }
        errors.push(errorMsg);
        continue;
      }

      if (shouldClone) {
        const entryManifest = _.cloneDeep(baseMediaFusion.manifest || {});
        if (entryManifest?.name) {
          entryManifest.name += ` | ${serviceName}`;
        }
        rebuilt[name] = {
          transportUrl: encrypted,
          manifest: entryManifest
        };
      } else {
        presetConfig.mediafusion.transportUrl = encrypted;
        if (presetConfig.mediafusion.manifest?.name) {
          presetConfig.mediafusion.manifest.name += ` | ${serviceName}`;
        }
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      const serviceName =
        debridServicesInfo[debrid.service]?.name || debrid.service;
      if (!shouldClone) {
        delete presetConfig.mediafusion;
        throw new Error(
          `MediaFusion configuration failed for ${serviceName}: ${errorMsg}`
        );
      }
      errors.push(`${serviceName}: ${errorMsg}`);
    }
  }

  // If all debrid configurations failed in clone mode, throw an error
  if (shouldClone && errors.length === debridEntries.length) {
    throw new Error(
      `MediaFusion: All debrid configurations failed - ${errors.join('; ')}`
    );
  }

  return shouldClone
    ? { rebuilt, shouldReplace: true, errors }
    : { shouldReplace: false, errors };
}
