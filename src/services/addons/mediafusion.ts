import _ from 'lodash';
import { getAddonConfig as getMediaFusionConfig } from '../../api/mediafusionApi';
import { convertToBytes } from '../../utils/sizeConverters';
import { debridServicesInfo } from '../../utils/debrid';
import type { AddonConfigContext, DebridEntry } from './types';
import { getLanguageName } from '../../utils/language';

function buildStreamingProvider(
  debrid: DebridEntry,
  index: number,
  cached: boolean
) {
  return {
    name: debridServicesInfo[debrid.service]?.label || debrid.service,
    service: debrid.service,
    token: debrid.key,
    enable_watchlist_catalogs: false,
    qbittorrent_config: null,
    only_show_cached_streams: cached,
    use_mediaflow: true,
    sabnzbd_config: null,
    nzbget_config: null,
    nzbdav_config: null,
    easynews_config: null,
    priority: index,
    enabled: true
  };
}

export async function configureMediaFusion(
  presetConfig: any,
  mediaFusionConfig: any,
  context: AddonConfigContext
): Promise<void> {
  if (!presetConfig.mediafusion) return;

  const { debridEntries, language, no4k, cached, size } = context;

  const prepareConfig = (config: any) => {
    if (language !== 'en') {
      _.pull(config.language_sorting, getLanguageName(language));
      config.language_sorting.unshift(getLanguageName(language));
    }

    if (no4k) {
      _.pull(config.selected_resolutions, '4k', '2160p', '1440p');
    }

    if (size) {
      config.max_size = convertToBytes(size);
    }
  };

  const config = _.cloneDeep(mediaFusionConfig);
  prepareConfig(config);

  if (debridEntries.length > 0) {
    config.streaming_providers = debridEntries.map((debrid, index) =>
      buildStreamingProvider(debrid, index, cached)
    );
    config.streaming_provider = buildStreamingProvider(
      debridEntries[0]!,
      0,
      cached
    );
  } else {
    delete config.streaming_provider;
  }

  const encrypted = await getMediaFusionConfig(config);
  if (!encrypted) {
    delete presetConfig.mediafusion;
    throw new Error(
      'Failed to get MediaFusion configuration - invalid response'
    );
  }

  presetConfig.mediafusion.transportUrl = encrypted;

  if (debridEntries.length > 0) {
    const manifestName = debridEntries
      .map((d) => debridServicesInfo[d.service]?.name || d.service)
      .join(' + ');
    if (presetConfig.mediafusion.manifest?.name) {
      presetConfig.mediafusion.manifest.name += ` | ${manifestName}`;
    }
  }
}
