import { updateTransportUrl } from '../../utils/transportUrl';
import { convertToMegabytes } from '../../utils/sizeConverters';
import type { AddonConfigContext } from './types';

export function configureTorrentsDB(
  presetConfig: any,
  context: AddonConfigContext
): void {
  if (!presetConfig.torrentsdb) return;

  const { debridEntries, debridServiceName, size, no4k } = context;

  const updateData: any = {
    sizefilter: size ? convertToMegabytes(size) : '',
    qualityfilter: [] as string[]
  };

  if (debridEntries.length > 0) {
    updateData.sort = 'qualitysize';
    debridEntries.forEach((debrid) => {
      updateData[debrid.service] = debrid.key;
    });
  }

  if (presetConfig.torrentsdb.transportUrl) {
    const decoded = decodeURIComponent(presetConfig.torrentsdb.transportUrl);
    const qualityMatch = decoded.match(/qualityfilter=([^&|]+)/);
    if (qualityMatch?.[1]) {
      const existingFilters = qualityMatch[1]!.split(',');
      updateData.qualityfilter = [
        ...existingFilters,
        ...(no4k
          ? ['4k', 'brremux', 'hdrall', 'dolbyvisionwithhdr', 'dolbyvision']
          : [])
      ];
    }
  }

  updateTransportUrl({
    presetConfig,
    serviceKey: 'torrentsdb',
    manifestNameSuffix: debridServiceName,
    updateData: (data: any) => ({
      ...data,
      ...updateData
    })
  });
}
