export const LANGUAGE_MAP: Record<string, string> = {
  'es-MX': 'Latino',
  'es-ES': 'Spanish',
  'pt-BR': 'Portuguese',
  'pt-PT': 'Portuguese',
  fr: 'French',
  it: 'Italian',
  de: 'German',
  nl: 'Dutch',
  en: 'English'
};

export const getLanguageName = (code: string): string => {
  return LANGUAGE_MAP[code] || code;
};
