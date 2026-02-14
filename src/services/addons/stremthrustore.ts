import { updateTransportUrl } from '../../utils/transportUrl';
import type { AddonConfigContext } from './types';

export function configureStremThruStore(
  presetConfig: any,
  context: AddonConfigContext
): void {
  if (!presetConfig.stremthrustore) return;

  const { debridServiceName } = context;

  updateTransportUrl({
    presetConfig,
    serviceKey: 'stremthrustore',
    manifestNameSuffix: debridServiceName,
    updateData: (data: any) => ({
      ...data
    })
  });
}
