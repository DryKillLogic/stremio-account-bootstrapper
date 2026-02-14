import _ from 'lodash';
import { getAddonConfig as getAioListsConfig } from '../../api/aiolistsApi';

export async function configureAIOLists(
  presetConfig: any,
  data: any,
  preset: string,
  language: string,
  rpdbKey?: string
): Promise<void> {
  if (!presetConfig.aiolists) return;

  // Determine config (kids vs regular)
  const aiolistsConfig =
    preset === 'kids' ? data.aiolistsKidsConfig : data.aiolistsConfig;

  // Set language
  aiolistsConfig.config.tmdbLanguage =
    language === 'es-MX' || language === 'es-ES' ? 'es' : language;

  // Merge language-specific config
  aiolistsConfig.config = _.merge(
    {},
    aiolistsConfig.config,
    language !== 'en' ? aiolistsConfig[language] : {}
  );

  // Set RPDB key if provided
  if (rpdbKey) {
    aiolistsConfig.config.rpdbApiKey = rpdbKey;
    aiolistsConfig.config.isConnected = aiolistsConfig.config.isConnected || {};
    aiolistsConfig.config.isConnected.rpdb = true;
  }

  // Request AIOLists configuration
  try {
    const aiolistsData = await getAioListsConfig(aiolistsConfig);
    if (aiolistsData && aiolistsData.manifest && aiolistsData.transportUrl) {
      presetConfig.aiolists.manifest = aiolistsData.manifest;
      presetConfig.aiolists.transportUrl = aiolistsData.transportUrl;
    } else {
      delete presetConfig.aiolists;
    }
  } catch (e) {
    delete presetConfig.aiolists;
  }
}
