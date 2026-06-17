import { updateTransportUrl } from '../../utils/transportUrl';
import { debridServicesInfo } from '../../utils/debrid';
import type { AddonConfigContext } from './types';

export function configureStremThruTorz(
  presetConfig: any,
  context: AddonConfigContext
): void {
  if (!presetConfig.stremthrutorz) return;

  const { debridEntries, debridServiceName, cached } = context;

  updateTransportUrl({
    presetConfig,
    serviceKey: 'stremthrutorz',
    manifestNameSuffix: debridEntries.length > 0 ? debridServiceName : '',
    updateData: (data: any) => ({
      ...data,
      stores:
        debridEntries.length > 0
          ? debridEntries.map((debrid) => ({
              c:
                debridServicesInfo[debrid.service]?.name?.toLowerCase() ||
                debrid.service,
              t: debrid.key
            }))
          : [{ c: 'p2p', t: '' }],
      cached
    })
  });
}
