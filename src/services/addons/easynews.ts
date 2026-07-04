import type { AddonConfigContext } from './types';

const EASYNEWS_BASE = 'https://en.pantelx.com';
const DEFAULT_QUALITIES = '4k,1080p,720p,480p';

const EASYNEWS_LANGUAGE_MAP: Record<string, string> = {
  en: 'eng',
  'es-ES': 'spa',
  'es-MX': 'spa',
  fr: 'fra',
  de: 'deu',
  it: 'ita',
  nl: 'nld',
  'pt-BR': 'por',
  'pt-PT': 'por'
};

function buildEasynewsManifestUrl(
  username: string,
  password: string,
  context: AddonConfigContext
): string {
  const { language, no4k, size } = context;

  const lang = EASYNEWS_LANGUAGE_MAP[language] || 'eng';

  const qualities = no4k
    ? DEFAULT_QUALITIES.split(',')
        .filter((q) => q !== '4k')
        .join(',')
    : DEFAULT_QUALITIES;

  const maxFileSize = size ? String(size) : '';

  const config = {
    uiLanguage: lang,
    username,
    password,
    strictTitleMatching: 'on',
    preferredLanguage: lang,
    sortingPreference: 'language_first',
    showQualities: qualities,
    maxResultsPerQuality: '10',
    maxFileSize,
    baseUrl: EASYNEWS_BASE
  };

  const encoded = encodeURIComponent(JSON.stringify(config));
  return `${EASYNEWS_BASE}/${encoded}/manifest.json`;
}

export function configureEasynews(
  presetConfig: any,
  context: AddonConfigContext
): void {
  const { easynewsEntry } = context;

  if (
    context.preset === 'allinone' ||
    !easynewsEntry?.username ||
    !easynewsEntry?.password
  ) {
    delete presetConfig.easynews;
    return;
  }

  const transportUrl = buildEasynewsManifestUrl(
    easynewsEntry.username,
    easynewsEntry.password,
    context
  );

  if (presetConfig.easynews) {
    presetConfig.easynews.transportUrl = transportUrl;
  }
}
