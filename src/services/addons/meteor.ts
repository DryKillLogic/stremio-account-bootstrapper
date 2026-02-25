import _ from 'lodash';
import { updateTransportUrl } from '../../utils/transportUrl';
import { debridServicesInfo } from '../../utils/debrid';
import type { AddonConfigContext } from './types';

export function configureMeteor(
  presetConfig: any,
  context: AddonConfigContext
): { rebuilt?: any; shouldReplace: boolean } {
  if (!presetConfig.meteor) return { shouldReplace: false };

  const { debridEntries, cached, limit, size, no4k, language } = context;

  const sizeRange = size
    ? (() => {
        const sizeNum = Number(size);
        if (sizeNum <= 10) return 10;
        if (sizeNum < 20) return 20;
        if (sizeNum <= 30) return 50;
        return '';
      })()
    : '';

  const languageCode = language.slice(0, 2) || 'en';

  const prepareConfig = (data: any) => {
    const clonedData = _.cloneDeep(data);

    clonedData.languages = {
      preferred: [languageCode, 'multi'],
      ...clonedData.languages
    };
    clonedData.cachedOnly = cached;
    clonedData.maxResultsPerRes = limit;
    clonedData.maxSize = size ? sizeRange : 0;
    clonedData.resolutions = no4k
      ? (clonedData.resolutions ?? []).filter((res: string) => res !== '4k')
      : (clonedData.resolutions ?? []);

    return clonedData;
  };

  if (debridEntries.length === 0) {
    updateTransportUrl({
      presetConfig,
      serviceKey: 'meteor',
      manifestNameSuffix: '',
      updateData: (data: any) => {
        const clonedData = prepareConfig(data);
        clonedData.debridApiKey = '';
        clonedData.debridService = 'torrent';
        return clonedData;
      }
    });
    return { shouldReplace: false };
  }

  const shouldClone = debridEntries.length >= 2;
  const baseMeteor = shouldClone
    ? _.cloneDeep(presetConfig.meteor)
    : presetConfig.meteor;
  const rebuilt: any = {};

  for (const debrid of debridEntries) {
    const name = shouldClone ? `meteor_${debrid.service}` : 'meteor';

    if (shouldClone) {
      const entryManifest = _.cloneDeep(baseMeteor.manifest || {});
      if (entryManifest?.name) {
        entryManifest.name += ` | ${debridServicesInfo[debrid.service]?.name || debrid.service}`;
      }

      rebuilt[name] = {
        ...baseMeteor,
        manifest: entryManifest
      };

      updateTransportUrl({
        presetConfig: rebuilt,
        serviceKey: name,
        manifestNameSuffix: '',
        updateData: (data: any) => {
          const clonedData = prepareConfig(data);
          clonedData.debridApiKey = debrid.key;
          clonedData.debridService = debrid.service;
          return clonedData;
        }
      });
    } else {
      updateTransportUrl({
        presetConfig,
        serviceKey: 'meteor',
        manifestNameSuffix: '',
        updateData: (data: any) => {
          const clonedData = prepareConfig(data);
          clonedData.debridApiKey = debrid.key;
          clonedData.debridService = debrid.service;
          return clonedData;
        }
      });

      if (presetConfig.meteor.manifest?.name) {
        presetConfig.meteor.manifest.name += ` | ${debridServicesInfo[debrid.service]?.name || debrid.service}`;
      }
    }
  }

  return shouldClone
    ? { rebuilt, shouldReplace: true }
    : { shouldReplace: false };
}
