import _ from 'lodash';
import type { AddonConfigContext, SquirrellyRenderer } from './types';
import { debridServicesInfo } from '../../utils/debrid';

export function configureTorrentio(
  presetConfig: any,
  context: AddonConfigContext,
  Sqrl: SquirrellyRenderer
): { rebuilt?: any; shouldReplace: boolean } {
  if (!presetConfig.torrentio) return { shouldReplace: false };

  const { debridEntries, no4k, cached, limit, size } = context;

  if (debridEntries.length === 0) {
    presetConfig.torrentio.transportUrl = Sqrl.render(
      presetConfig.torrentio.transportUrl,
      {
        transportUrl: '',
        no4k: no4k ? '4k,' : '',
        limit,
        maxSize: size ? `|sizefilter=${size}GB` : ''
      }
    );
    return { shouldReplace: false };
  }

  const shouldClone = debridEntries.length >= 2;
  const baseTorrentio = shouldClone
    ? _.cloneDeep(presetConfig.torrentio)
    : presetConfig.torrentio;
  const rebuilt: any = {};

  for (const debrid of debridEntries) {
    const addon = shouldClone ? _.cloneDeep(baseTorrentio) : baseTorrentio;
    const name = shouldClone ? `torrentio_${debrid.service}` : 'torrentio';
    const servicePair = `${debrid.service}=${debrid.key}`;

    addon.transportUrl = Sqrl.render(baseTorrentio.transportUrl, {
      transportUrl: `|sort=qualitysize|debridoptions=${cached ? 'nodownloadlinks,' : ''}nocatalog|${servicePair}`,
      no4k: no4k ? '4k,' : '',
      limit,
      maxSize: size ? `|sizefilter=${size}GB` : ''
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
