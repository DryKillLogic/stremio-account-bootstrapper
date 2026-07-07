import { LOCALE_MESSAGES } from '../locales';

function toKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function translateCollections(
  collections: any[],
  language: string
): any[] {
  const lang = language.split('-')[0] || 'en';
  const messages = LOCALE_MESSAGES[lang] ?? LOCALE_MESSAGES['en'] ?? {};
  const suffix = messages['nuvio_collection_suffix'] || 'Collection';

  return collections.map((collection) => {
    const colSlug = toKey(collection.title);
    const colKey = 'nuvio_collection_' + colSlug;
    const translated = messages[colKey]
      ? { ...collection, title: messages[colKey] }
      : { ...collection };

    if (translated.folders) {
      translated.folders = translated.folders.map(
        (folder: { title: string; sources?: { title: string }[] }) => {
          const folderKey =
            'nuvio_collection_' + colSlug + '_' + toKey(folder.title);
          if (messages[folderKey]) {
            const translatedTitle = messages[folderKey];
            return {
              ...folder,
              title: translatedTitle,
              sources: folder.sources?.map((src) => ({
                ...src,
                title: translatedTitle + ' ' + suffix
              }))
            };
          }
          return folder;
        }
      );
    }

    return translated;
  });
}
