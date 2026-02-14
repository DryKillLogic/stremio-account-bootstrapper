import { updateTransportUrl } from '../../utils/transportUrl';
import type { AddonConfigContext } from './types';

export function configureStremThruTorz(
  presetConfig: any,
  context: AddonConfigContext
): void {
  if (!presetConfig.stremthrutorz) return;

  const { debridEntries, debridServiceName, cached } = context;

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
    manifestNameSuffix: debridEntries.length > 0 ? debridServiceName : '',
    updateData: (data: any) => ({
      ...data,
      stores:
        debridEntries.length > 0
          ? debridEntries.map((debrid) => ({
              c: stremthrutorzDebridService[debrid.service] || debrid.service,
              t: debrid.key
            }))
          : [{ c: 'p2p', t: '' }],
      cached
    })
  });
}
