export type DebridService =
  | 'alldebrid'
  | 'premiumize'
  | 'debridlink'
  | 'realdebrid'
  | 'torbox';

export const debridServicesInfo = {
  realdebrid: {
    name: 'RD',
    label: 'RealDebrid',
    url: 'https://real-debrid.com/apitoken'
  },
  alldebrid: {
    name: 'AD',
    label: 'AllDebrid',
    url: 'https://alldebrid.com/apikeys'
  },
  premiumize: {
    name: 'PM',
    label: 'Premiumize',
    url: 'https://www.premiumize.me/account'
  },
  debridlink: {
    name: 'DL',
    label: 'DebridLink',
    url: 'https://debrid-link.com/webapp/apikey'
  },
  torbox: { name: 'TB', label: 'TorBox', url: 'https://torbox.app/settings' }
};

export const isValidApiKey = (
  service: DebridService,
  apiKey: string | undefined | null
): boolean => {
  if (!apiKey) return false;
  const key = String(apiKey).trim();
  const patterns: Record<DebridService, RegExp> = {
    alldebrid: /^[a-zA-Z0-9]{20}$/,
    premiumize: /^[a-z0-9]{16}$/i,
    debridlink: /^[A-Za-z0-9]{35}$/i,
    realdebrid: /^[A-Z0-9]{52}$/,
    torbox: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  };
  return !!patterns[service]?.test(key);
};
