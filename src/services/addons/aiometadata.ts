import _ from 'lodash';
import { getAddonConfig as getAioMetadataConfig } from '../../api/aioMetadataApi';
import { LOCALE_MESSAGES } from '../../locales';

function generateCatalogI18nKey(catalog: any): string {
  const source = catalog.source;
  const type = catalog.type;
  const nameSlug = catalog.name
    .toLowerCase()
    .replace(/\s*&\s*/g, '_and_')
    .replace(/\+/g, '_plus')
    .replace(/\s+/g, '_')
    .replace(/[^\w_]/g, '');

  return `catalogs_${source}_${type}_${nameSlug}`;
}

function translateCatalogName(catalogs: any[], language: string): any[] {
  const lang = (language ? String(language) : 'en').split('-')[0] as string;
  const messages = LOCALE_MESSAGES[lang] || LOCALE_MESSAGES.en;

  if (lang === 'en') {
    return catalogs;
  }

  catalogs.forEach((catalog) => {
    const i18nKey = generateCatalogI18nKey(catalog);
    const translatedTitle = messages?.[i18nKey];

    if (translatedTitle && translatedTitle !== i18nKey) {
      catalog.name = translatedTitle;
    }
  });

  return catalogs;
}

export async function configureAioMetadata(
  presetConfig: any,
  data: any,
  language: string,
  kids: boolean,
  password: string,
  rpdbKey?: string
): Promise<void> {
  if (!presetConfig.aiometadata) return;

  const aioMetadataConfig = data.aioMetadataConfig;

  // Set language
  aioMetadataConfig.config.language = language;

  // Set kids mode
  if (kids) {
    aioMetadataConfig.config.catalogs = aioMetadataConfig.catalogs.kids;
    aioMetadataConfig.config.ageRating = 'G';
    aioMetadataConfig.config.search.engineEnabled = {
      ...aioMetadataConfig.config.search.engineEnabled,
      'kitsu.search.series': false,
      'kitsu.search.movie': false
    };
  } else {
    aioMetadataConfig.config.catalogs = aioMetadataConfig.catalogs.standard;
  }

  // Translate catalog names
  if (aioMetadataConfig.config.catalogs) {
    aioMetadataConfig.config.catalogs = translateCatalogName(
      aioMetadataConfig.config.catalogs,
      language
    );
  }

  // Set RPDB key if provided
  if (rpdbKey) {
    aioMetadataConfig.config.apiKeys.rpdb = rpdbKey;
  }

  // Request AIOMetadata configuration
  try {
    const aiometadataData = await getAioMetadataConfig({
      config: aioMetadataConfig.config,
      password: password
    });
    if (
      aiometadataData &&
      aiometadataData.manifest &&
      aiometadataData.transportUrl
    ) {
      presetConfig.aiometadata.manifest = aiometadataData.manifest;
      presetConfig.aiometadata.manifest.name = 'AIOMetadata';
      presetConfig.aiometadata.transportUrl = aiometadataData.transportUrl;
    } else {
      delete presetConfig.aiometadata;
    }
  } catch (e) {
    delete presetConfig.aiometadata;
  }
}
