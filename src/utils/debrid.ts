export type DebridService =
  | 'alldebrid'
  | 'premiumize'
  | 'debridlink'
  | 'realdebrid'
  | 'torbox'
  | 'offcloud'
  | 'highway'
  | 'easynews';

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
  torbox: { name: 'TB', label: 'TorBox', url: 'https://torbox.app/settings' },
  offcloud: {
    name: 'OC',
    label: 'OffCloud',
    url: 'https://offcloud.com/account'
  },
  highway: {
    name: 'HW',
    label: 'HighWay',
    url: 'https://cloud.high-way.me/#sessions'
  },
  easynews: {
    name: 'EN',
    label: 'Easynews',
    url: 'https://www.easynews.com/'
  }
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
    debridlink: /^[A-Z0-9]{6}-[A-Z0-9]{6}-[A-Z0-9]{6}-[A-Z0-9]{5}$/,
    realdebrid: /^[A-Z0-9]{52}$/,
    torbox: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    offcloud: /^[a-zA-Z0-9]{16}$/,
    highway: /^[a-f0-9]{32}$/i,
    easynews: /.*/
  };
  return !!patterns[service]?.test(key);
};

// Services that only some addons support, mapped to the preset keys of those addons
export const limitedDebridServices: Partial<Record<DebridService, string[]>> = {
  highway: ['torrentio']
};

export const supportsDebridService = (
  addonKey: string | undefined,
  service: DebridService
): boolean => {
  const addons = limitedDebridServices[service];
  return !addons || (!!addonKey && addons.includes(addonKey));
};

export const isTorbox = (
  debridEntries: { service: DebridService; key: string }[]
) => debridEntries.find((debrid) => debrid.service === 'torbox');

export const isRealDebrid = (
  debridEntries: { service: DebridService; key: string }[]
) => debridEntries.find((debrid) => debrid.service === 'realdebrid');
