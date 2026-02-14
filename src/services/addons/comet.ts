import { updateTransportUrl } from '../../utils/transportUrl';
import { convertToBytes } from '../../utils/sizeConverters';
import type { AddonConfigContext } from './types';

export function configureComet(
  presetConfig: any,
  context: AddonConfigContext
): void {
  if (!presetConfig.comet) return;

  const { debridEntries, cached, limit, size, no4k, debridServiceName } =
    context;

  const debridServices = debridEntries.map((debrid) => ({
    service: debrid.service,
    apiKey: debrid.key
  }));

  updateTransportUrl({
    presetConfig,
    serviceKey: 'comet',
    manifestNameSuffix: debridServiceName,
    updateData: (data: any) => ({
      ...data,
      debridServices,
      cachedOnly: cached,
      enableTorrent: debridServices.length === 0,
      maxResultsPerResolution: limit,
      maxSize: size ? convertToBytes(size) : 0,
      resolutions: {
        ...data.resolutions,
        r2160p: no4k ? false : true
      }
    })
  });
}
