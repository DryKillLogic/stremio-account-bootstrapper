import { updateTransportUrl } from '../../utils/transportUrl';
import type { AddonConfigContext } from './types';

export function configureSootio(
  presetConfig: any,
  context: AddonConfigContext
): void {
  if (!presetConfig.sootio) return;

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

  if (sootioDebridEntries.length === 0) {
    delete presetConfig.sootio;
  } else {
    updateTransportUrl({
      presetConfig,
      serviceKey: 'sootio',
      manifestNameSuffix: debridServiceName,
      updateData: (data: any) => ({
        ...data,
        DebridServices: sootioDebridEntries.map((e) => ({
          provider: providerMap[e.service] || e.service,
          apiKey: e.key
        })),
        maxSize: size ? size : 200
      }),
      base64: false
    });
  }
}
