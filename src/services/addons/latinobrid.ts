import { debridServicesInfo } from '../../utils/debrid';
import { encodeDataFromTransportUrl } from '../../utils/transportUrl';
import type { AddonConfigContext, DebridEntry } from './types';

const LATINOBRID_BASE_URL = 'https://latinobrid.stremx.net';
const LATINOBRID_SERVICES = new Set(['torbox', 'premiumize', 'offcloud']);

export function getLatinobridDebridEntry(
  debridEntries: DebridEntry[]
): DebridEntry | undefined {
  return debridEntries.find((entry) => LATINOBRID_SERVICES.has(entry.service));
}

export function getLatinobridName(debrid: DebridEntry): string {
  return `Latinobrid | ${debridServicesInfo[debrid.service].name}`;
}

export function getLatinobridManifestUrl(debrid: DebridEntry): string {
  const encodedConfig = encodeDataFromTransportUrl({
    service: debrid.service,
    apiKey: debrid.key,
    uncached: false,
    extraCatalogs: false
  }).replace(/=+$/, '');

  return `${LATINOBRID_BASE_URL}/${encodedConfig}/manifest.json`;
}

export function configureLatinobrid(
  presetConfig: any,
  context: AddonConfigContext
): void {
  if (!presetConfig.latinobrid) return;

  const debrid = getLatinobridDebridEntry(context.debridEntries);

  if (!debrid) {
    delete presetConfig.latinobrid;
    return;
  }

  presetConfig.latinobrid.transportUrl = getLatinobridManifestUrl(debrid);

  if (presetConfig.latinobrid.manifest) {
    presetConfig.latinobrid.manifest.name = getLatinobridName(debrid);
  }
}
