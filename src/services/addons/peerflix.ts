import _ from 'lodash';
import type { AddonConfigContext, SquirrellyRenderer } from './types';
import { debridServicesInfo } from '../../utils/debrid';

export function configurePeerflix(
  presetConfig: any,
  context: AddonConfigContext,
  Sqrl: SquirrellyRenderer
): { rebuilt?: any; shouldReplace: boolean } {
  if (!presetConfig.peerflix) return { shouldReplace: false };

  const { debridEntries, no4k, cached } = context;

  if (debridEntries.length === 0) {
    presetConfig.peerflix.transportUrl = Sqrl.render(
      presetConfig.peerflix.transportUrl,
      {
        transportUrl: '',
        no4k: no4k ? ',remux4k,4k,micro4k' : '',
        sort: ',seed-desc'
      }
    );
    return { shouldReplace: false };
  }

  const shouldClone = debridEntries.length >= 2;
  const basePeerflix = shouldClone
    ? _.cloneDeep(presetConfig.peerflix)
    : presetConfig.peerflix;
  const rebuilt: any = {};

  for (const debrid of debridEntries) {
    const addon = shouldClone ? _.cloneDeep(basePeerflix) : basePeerflix;
    const name = shouldClone ? `peerflix_${debrid.service}` : 'peerflix';
    const servicePair = `${debrid.service}=${debrid.key}`;

    addon.transportUrl = Sqrl.render(basePeerflix.transportUrl, {
      transportUrl: `%7Cdebridoptions=nocatalog${cached ? ',nodownloadlinks' : ''}%7C${servicePair}`,
      no4k: no4k ? ',remux4k,4k,micro4k' : '',
      sort: ',size-desc'
    });

    addon.manifest = addon.manifest || {};
    addon.manifest.name =
      (addon.manifest.name || '') +
      ` | ${debridServicesInfo[debrid.service]?.name || debrid.service}`;

    if (shouldClone) {
      rebuilt[name] = addon;
    }
  }

  return shouldClone
    ? { rebuilt, shouldReplace: true }
    : { shouldReplace: false };
}
