import _ from 'lodash';
import { debridServicesInfo } from '../../utils/debrid';
import {
  getDataTransportUrl,
  getUrlTransportUrl
} from '../../utils/transportUrl';
import type { AddonConfigContext } from './types';

export function configureJackettio(
  presetConfig: any,
  context: AddonConfigContext
): { rebuilt?: any; shouldReplace: boolean } {
  if (!presetConfig.jackettio) return { shouldReplace: false };

  const { debridEntries, no4k, cached } = context;

  if (debridEntries.length === 0) {
    // Remove addon as it requires a debrid service
    delete presetConfig.jackettio;
    return { shouldReplace: false };
  }

  const shouldClone = debridEntries.length >= 2;
  const baseJackettio = shouldClone
    ? _.cloneDeep(presetConfig.jackettio)
    : presetConfig.jackettio;
  const rebuilt: any = {};

  for (const debrid of debridEntries) {
    const addon = shouldClone ? _.cloneDeep(baseJackettio) : baseJackettio;
    const name = shouldClone ? `jackettio_${debrid.service}` : 'jackettio';

    // Update transportUrl
    if (addon.transportUrl) {
      const transportUrl = getDataTransportUrl(addon.transportUrl, true);
      addon.transportUrl = getUrlTransportUrl(
        transportUrl,
        {
          ...transportUrl.data,
          debridEntries: [debrid],
          debridApiKey: debrid.key,
          debridId: debrid.service,
          hideUncached: cached,
          qualities: no4k
            ? _.pull(
                _.cloneDeep((transportUrl.data as any).qualities || []),
                2160
              )
            : (transportUrl.data as any).qualities
        },
        true
      );
    }

    // Update manifest name
    if (addon.manifest?.name) {
      const serviceName =
        debridServicesInfo[debrid.service]?.name || debrid.service;
      addon.manifest.name += ` | ${serviceName}`;
    }

    if (shouldClone) {
      rebuilt[name] = addon;
    }
  }

  return shouldClone
    ? { rebuilt, shouldReplace: true }
    : { shouldReplace: false };
}
