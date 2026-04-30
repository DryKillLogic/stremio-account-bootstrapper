import { updateTransportUrl } from '../../utils/transportUrl';
import type { AddonConfigContext } from './types';

export function configureSootio(
  presetConfig: any,
  context: AddonConfigContext,
  variantName?: string
): void {
  if (!presetConfig.sootio || !presetConfig.sootiohttp) return;

  const serviceKey = variantName === 'http' ? 'sootiohttp' : 'sootio';

  const { debridEntries, debridServiceName, size } = context;

  const providerMap: Record<string, string> = {
    realdebrid: 'RealDebrid',
    alldebrid: 'AllDebrid',
    premiumize: 'Premiumize',
    torbox: 'TorBox'
  };

  const sootioDebridEntries = debridEntries.filter(
    (debrid) => debrid.service !== 'debridlink'
  );

  const isSootioHttp = variantName === 'http';

  if (sootioDebridEntries.length === 0 && !isSootioHttp) {
    delete presetConfig[serviceKey];
  } else {
    updateTransportUrl({
      presetConfig,
      serviceKey,
      manifestNameSuffix: !isSootioHttp ? debridServiceName : '',
      updateData: (data: any) => {
        const updatedData = {
          ...data,
          maxSize: size ? size : 200
        };

        if (!isSootioHttp) {
          updatedData.DebridServices = sootioDebridEntries.map((e) => ({
            provider: providerMap[e.service] || e.service,
            apiKey: e.key
          }));
        }

        return updatedData;
      },
      base64: false
    });
  }
}
