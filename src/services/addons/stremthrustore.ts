import _ from 'lodash';
import { updateTransportUrl } from '../../utils/transportUrl';
import { getAddonConfig } from '../../api/stremthruApi';
import type { AddonConfigContext } from './types';

export async function configureStremThruStore(
  presetConfig: any,
  context: AddonConfigContext
): Promise<{ rebuilt?: any; shouldReplace: boolean }> {
  if (!presetConfig.stremthrustore) return { shouldReplace: false };

  const { debridEntries } = context;

  if (debridEntries.length === 0) {
    return { shouldReplace: false };
  }

  const shouldClone = debridEntries.length >= 2;
  const baseAddon = shouldClone
    ? _.cloneDeep(presetConfig.stremthrustore)
    : presetConfig.stremthrustore;
  const rebuilt: any = {};
  const errors: string[] = [];

  for (const debrid of debridEntries) {
    const addon = shouldClone ? _.cloneDeep(baseAddon) : baseAddon;
    const name = shouldClone
      ? `stremthrustore_${debrid.service}`
      : 'stremthrustore';

    updateTransportUrl({
      presetConfig: shouldClone ? { [name]: addon } : presetConfig,
      serviceKey: name,
      manifestNameSuffix: debrid.service,
      updateData: (data: any) => ({
        ...data,
        store_name: debrid.service,
        store_token: debrid.key
      })
    });

    try {
      const manifestData = await getAddonConfig(addon.transportUrl);
      if (manifestData) {
        addon.manifest = manifestData;
        if (shouldClone) {
          rebuilt[name] = addon;
        }
      } else {
        const errorMsg = `No manifest data returned for ${debrid.service}`;
        if (!shouldClone) {
          delete presetConfig.stremthrustore;
          throw new Error(`StremThru Store: ${errorMsg}`);
        }
        errors.push(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (!shouldClone) {
        delete presetConfig.stremthrustore;
        throw new Error(`StremThru Store configuration failed for ${debrid.service}: ${errorMsg}`);
      }
      errors.push(`${debrid.service}: ${errorMsg}`);
    }
  }

  // If all configurations failed in clone mode, throw an error
  if (shouldClone && errors.length === debridEntries.length) {
    throw new Error(`StremThru Store: All configurations failed - ${errors.join('; ')}`);
  }

  return shouldClone
    ? { rebuilt, shouldReplace: true }
    : { shouldReplace: false };
}
