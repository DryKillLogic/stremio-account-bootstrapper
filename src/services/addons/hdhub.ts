import { updateTransportUrl } from '../../utils/transportUrl';
import type { AddonConfigContext } from './types';
import { isTorbox } from '../../utils/debrid';

export function configureHdHub(
  presetConfig: any,
  context: AddonConfigContext
): void {
  if (!presetConfig.hdhub) return;

  const { debridEntries, debridServiceName, language, limit } = context;

  const torboxEntry = isTorbox(debridEntries);

  updateTransportUrl({
    presetConfig,
    serviceKey: 'hdhub',
    manifestNameSuffix: torboxEntry ? debridServiceName : undefined,
    updateData: (data: any) => ({
      ...data,
      torbox: torboxEntry ? torboxEntry.key : 'unset',
      content: language === 'es-MX' ? 'latin' : '',
      mq: limit
    })
  });
}
