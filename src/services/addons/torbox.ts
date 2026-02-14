import type { AddonConfigContext, SquirrellyRenderer } from './types';

interface TorboxAddonConfig {
  transportUrl: string;
}

interface PresetConfig {
  torbox?: TorboxAddonConfig;
  [key: string]: any;
}

export function configureTorbox(
  presetConfig: PresetConfig,
  context: AddonConfigContext,
  Sqrl: SquirrellyRenderer
): void {
  if (!presetConfig.torbox) return;

  const { debridEntries } = context;

  // Check if we have a Torbox entry in debrid services
  const torboxEntry = debridEntries.find(
    (debrid) => debrid.service === 'torbox'
  );

  if (torboxEntry) {
    presetConfig.torbox.transportUrl = Sqrl.render(
      presetConfig.torbox.transportUrl,
      {
        transportUrl: torboxEntry.key
      }
    );
  } else {
    delete presetConfig.torbox;
  }
}
