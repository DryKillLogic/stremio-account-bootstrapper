<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Buffer } from 'buffer';
import draggable from 'vuedraggable';
import AddonItem from './AddonItem.vue';
import DynamicForm from './DynamicForm.vue';
import _ from 'lodash';
import { setAddonCollection } from '../composables/useStremioApi';
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/outline';
import { addNotification } from '../composables/useNotifications';

const { t } = useI18n();

const props = defineProps({
  stremioAuthKey: { type: String }
});

let dragging = false;

let addons = ref([]);
let extras = ref([]);
let options = ref([]);
let maxSize = ref('');
let isSyncButtonEnabled = ref(false);
let isLoadingPreset = ref(false);
let isSyncAddons = ref(false);
let language = ref('en');
let preset = ref('standard');

const debridServiceInfo = {
  realdebrid: {
    name: 'RD',
    url: 'https://real-debrid.com/apitoken'
  },
  alldebrid: {
    name: 'AD',
    url: 'https://alldebrid.com/apikeys'
  },
  premiumize: {
    name: 'PM',
    url: 'https://www.premiumize.me/account'
  },
  debridlink: {
    name: 'DL',
    url: 'https://debrid-link.com/webapp/apikey'
  },
  easydebrid: {
    name: 'ED',
    url: 'https://paradise-cloud.com/dashboard'
  },
  torbox: {
    name: 'TB',
    url: 'https://torbox.app/settings'
  }
};
let debridService = ref('');
let debridApiKey = ref(null);
let debridApiUrl = ref('');
let debridServiceName = '';

const isDebridApiKeyValid = computed(() => isValidApiKey(debridService.value));

let torrentioConfig = '';
let peerflixConfig = '';
let rpdbKey = ref('');
let isEditModalVisible = ref(false);
let currentManifest = ref({});
let currentEditIdx = ref(null);

async function loadUserAddons() {
  const key = props.stremioAuthKey;
  if (!key) {
    console.error('No auth key provided');
    return;
  }

  isLoadingPreset.value = true;
  isSyncButtonEnabled.value = false;
  console.log('Loading addons...');

  try {
    const resp = await fetch('/preset.json');
    const data = await resp.json();

    if (!data) {
      console.error('Failed to fetch presets: ', data);
      addNotification(t('failed_fetching_presets'), 'error');
      return;
    }

    let presetConfig = {};
    let no4k = false;
    let cached = false;
    let limit = 10;
    let size = '';
    let cometTransportUrl = {};
    let jackettioTransportUrl = {};
    let torrentsdbTransportUrl = {};
    let stremthrutorzTransportUrl = {};
    let stremthrustoreTransportUrl = {};
    let streamAsiaTransportUrl = {};
    const mediaFusionConfig = data.mediafusionConfig;
    const aiolistsConfig =
      preset.value === 'kids' ? data.aiolistsKidsConfig : data.aiolistsConfig;

    // Set additional addons based on language selection
    if (language.value === 'es-mx') {
      data.presets[preset.value].push('subdivx');
    }

    // Get preset config
    presetConfig = _.pick(
      language.value === 'en'
        ? data.languages[language.value]
        : _.merge({}, data.languages.en, data.languages[language.value]),
      data.presets[preset.value]
    );

    // Set additional addons
    if (extras.value.length > 0) {
      extras.value.forEach((extra) => {
        presetConfig = _.merge({}, presetConfig, {
          [extra]: data.extras[extra]
        });
      });
    }

    // Set additional options
    no4k = options.value.includes('no4k');
    cached = options.value.includes('cached');
    limit = ['minimal', 'kids'].includes(preset.value) ? 2 : limit;
    size = maxSize.value ? maxSize.value : '';

    // Set AIOLists options
    aiolistsConfig.config.tmdbLanguage = language.value;
    aiolistsConfig.config = _.merge(
      {},
      aiolistsConfig.config,
      language.value !== 'en' ? aiolistsConfig[language.value] : {}
    );

    // Set RPDB key
    if (rpdbKey.value) {
      aiolistsConfig.config.rpdbApiKey = rpdbKey.value;
      aiolistsConfig.config.isConnected.rpdb = true;
    }

    // AIOLists request
    if (presetConfig.aiolists) {
      try {
        const encryptedAIOListsUserData = await encryptUserData(
          'https://aiolists.elfhosted.com/api/config/create',
          aiolistsConfig
        );

        if (encryptedAIOListsUserData.success) {
          presetConfig.aiolists.transportUrl = `https://aiolists.elfhosted.com/${encryptedAIOListsUserData.configHash}/manifest.json`;

          const manifestAIOListsUserData = await fetchUserData(
            presetConfig.aiolists.transportUrl
          );

          if (manifestAIOListsUserData) {
            presetConfig.aiolists.manifest = manifestAIOListsUserData;
          } else {
            presetConfig = _.omit(presetConfig, 'aiolists');
            console.log('Error fetching AIOLists user manifest.');
          }
        } else {
          presetConfig = _.omit(presetConfig, 'aiolists');
          console.log('Error fetching AIOLists encrypted user data.');
        }
      } catch (error) {
        console.error('An error occurred:', error);
      }
    }

    // Set options for debrid service
    if (isValidApiKey(debridService.value)) {
      debridServiceName = debridServiceInfo[debridService.value].name;

      // Torrentio
      if (presetConfig.torrentio) {
        torrentioConfig = `|sort=qualitysize|debridoptions=${cached ? 'nodownloadlinks,' : ''}nocatalog|${debridService.value}=${debridApiKey.value}`;
      }

      // Comet
      if (presetConfig.comet) {
        cometTransportUrl = getDataTransportUrl(
          presetConfig.comet.transportUrl
        );
        presetConfig.comet.manifest.name += ` | ${debridServiceName}`;
        presetConfig.comet.transportUrl = getUrlTransportUrl(
          cometTransportUrl,
          {
            ...cometTransportUrl.data,
            debridApiKey: debridApiKey.value,
            debridService: debridService.value,
            cachedOnly: cached
          }
        );
      }

      // MediaFusion
      if (presetConfig.mediafusion) {
        presetConfig.mediafusion.manifest.name += ` | ${debridServiceName}`;
        mediaFusionConfig.streaming_provider = {
          service: debridService.value,
          token: debridApiKey.value,
          enable_watchlist_catalogs: false,
          download_via_browser: false,
          only_show_cached_streams: cached
        };
      }

      // TorrentsDB
      if (presetConfig.torrentsdb) {
        torrentsdbTransportUrl = getDataTransportUrl(
          presetConfig.torrentsdb.transportUrl
        );
        presetConfig.torrentsdb.manifest.name += ` | ${debridServiceName}`;
        presetConfig.torrentsdb.transportUrl = getUrlTransportUrl(
          torrentsdbTransportUrl,
          {
            ...torrentsdbTransportUrl.data,
            sort: 'qualitysize',
            [debridService.value]: debridApiKey.value
          }
        );
      }

      // Jackettio
      if (presetConfig.jackettio) {
        jackettioTransportUrl = getDataTransportUrl(
          presetConfig.jackettio.transportUrl
        );
        presetConfig.jackettio.manifest.name += ` | ${debridServiceName}`;
        presetConfig.jackettio.transportUrl = getUrlTransportUrl(
          jackettioTransportUrl,
          {
            ...jackettioTransportUrl.data,
            debridApiKey: debridApiKey.value,
            debridId: debridService.value,
            hideUncached: cached,
            qualities: no4k
              ? _.pull(jackettioTransportUrl.data.qualities, 2160)
              : jackettioTransportUrl.data.qualities
          }
        );
      }

      // StremThru Torz
      if (presetConfig.stremthrutorz) {
        const stremthrutorzDebridService = {
          realdebrid: 'rd',
          alldebrid: 'ad',
          premiumize: 'pm',
          debridlink: 'dl',
          torbox: 'tb'
        };

        stremthrutorzTransportUrl = getDataTransportUrl(
          presetConfig.stremthrutorz.transportUrl
        );
        presetConfig.stremthrutorz.manifest.name += ` | ${debridServiceName}`;
        presetConfig.stremthrutorz.transportUrl = getUrlTransportUrl(
          stremthrutorzTransportUrl,
          {
            stores: [
              {
                c: stremthrutorzDebridService[debridService.value],
                t: debridApiKey.value
              }
            ],
            cached: cached
          }
        );
      }

      // Peerflix
      if (presetConfig.peerflix) {
        if (debridService.value !== 'easydebrid') {
          peerflixConfig = `%7Cdebridoptions=nocatalog${cached ? ',nodownloadlinks' : ''}%7C${debridService.value}=${debridApiKey.value}`;
        } else {
          presetConfig = _.omit(presetConfig, 'peerflix');
        }
      }

      // Torbox
      if (debridService.value === 'torbox' && presetConfig.torbox) {
        presetConfig.torbox.transportUrl = Sqrl.render(
          presetConfig.torbox.transportUrl,
          { transportUrl: debridApiKey.value }
        );
      } else {
        presetConfig = _.omit(presetConfig, 'torbox');
      }

      // StreamAsia
      if (presetConfig.streamasia && debridService.value !== 'easydebrid') {
        const streamAsiaDebridService = {
          realdebrid: 'Real Debrid',
          alldebrid: 'AllDebrid',
          premiumize: 'Premiumize',
          debridlink: 'Debrid-Link',
          torbox: 'Torbox'
        };

        streamAsiaTransportUrl = getDataTransportUrl(
          presetConfig.streamasia.transportUrl
        );
        presetConfig.streamasia.transportUrl = getUrlTransportUrl(
          streamAsiaTransportUrl,
          {
            ...streamAsiaTransportUrl.data,
            debridConfig: [
              {
                debridProvider: streamAsiaDebridService[debridService.value],
                token: debridApiKey.value
              }
            ]
          }
        );
      }

      // StremThru Store
      if (presetConfig.stremthrustore) {
        stremthrustoreTransportUrl = getDataTransportUrl(
          presetConfig.stremthrustore.transportUrl
        );
        presetConfig.stremthrustore.transportUrl = getUrlTransportUrl(
          stremthrustoreTransportUrl,
          {
            ...stremthrustoreTransportUrl.data,
            store_name: debridService.value,
            store_token: debridApiKey.value
          }
        );

        try {
          const manifestStremthruStoreUserData = await fetchUserData(
            `https://cloudflare-cors-anywhere.drykilllogic.workers.dev/?${presetConfig.stremthrustore.transportUrl}`
          );

          if (manifestStremthruStoreUserData) {
            presetConfig.stremthrustore.manifest =
              manifestStremthruStoreUserData;
          }
        } catch (error) {
          presetConfig = _.omit(presetConfig, 'stremthrustore');
          console.error('Error fetching StremThru Store manifest:', error);
        }
      }

      // Remove TPB+
      presetConfig = _.omit(presetConfig, 'tpbplus');
    } else {
      debridServiceName = '';
      // Remove Jackettio
      presetConfig = _.omit(presetConfig, 'jackettio');
      // Remove Torbox
      presetConfig = _.omit(presetConfig, 'torbox');
    }

    // Set stream addons options
    if (presetConfig.torrentio) {
      // Torrentio
      presetConfig.torrentio.transportUrl = Sqrl.render(
        presetConfig.torrentio.transportUrl,
        {
          transportUrl: torrentioConfig,
          no4k: no4k ? '4k,' : '',
          limit: limit,
          maxSize: size ? `|sizefilter=${size}GB` : ''
        }
      );
      presetConfig.torrentio.manifest.name += ` ${debridServiceName}`;
    }

    // Comet
    if (presetConfig.comet) {
      cometTransportUrl = getDataTransportUrl(presetConfig.comet.transportUrl);
      presetConfig.comet.transportUrl = getUrlTransportUrl(cometTransportUrl, {
        ...cometTransportUrl.data,
        maxResultsPerResolution: limit,
        maxSize: size ? convertToBytes(size) : 0,
        resolutions: {
          ...cometTransportUrl.data.resolutions,
          r2160p: no4k ? false : true
        }
      });
    }

    // MediaFusion
    if (presetConfig.mediafusion) {
      if (no4k) {
        _.pull(mediaFusionConfig.selected_resolutions, '4k', '2160p', '1440p');
      }

      const languagesToPrioritize = {
        'es-mx': 'Latino',
        'es-es': 'Spanish',
        pt: 'Portuguese',
        fr: 'French',
        it: 'Italian',
        de: 'German'
      };

      if (languagesToPrioritize[language.value]) {
        _.pull(
          mediaFusionConfig.language_sorting,
          languagesToPrioritize[language.value]
        );
        mediaFusionConfig.language_sorting.unshift(
          languagesToPrioritize[language.value]
        );
      }

      if (size) {
        mediaFusionConfig.max_size = convertToBytes(size);
      }

      const encryptedMediaFusionData = await encryptUserData(
        'https://cloudflare-cors-anywhere.drykilllogic.workers.dev/?https://mediafusion.elfhosted.com/encrypt-user-data',
        mediaFusionConfig
      );

      if (encryptedMediaFusionData?.status === 'success') {
        presetConfig.mediafusion.transportUrl = `https://mediafusion.elfhosted.com/${encryptedMediaFusionData.encrypted_str}/manifest.json`;
      } else {
        presetConfig = _.omit(presetConfig, 'mediafusion');
        console.log('Error fetching MediaFusion encrypted user data.');
      }
    }

    // TorrentsDB
    if (presetConfig.torrentsdb) {
      torrentsdbTransportUrl = getDataTransportUrl(
        presetConfig.torrentsdb.transportUrl
      );
      presetConfig.torrentsdb.transportUrl = getUrlTransportUrl(
        torrentsdbTransportUrl,
        {
          ...torrentsdbTransportUrl.data,
          sizefilter: size ? convertToMegabytes(size) : '',
          qualityfilter: [
            ...torrentsdbTransportUrl.data.qualityfilter,
            ...(no4k
              ? ['4k', 'brremux', 'hdrall', 'dolbyvisionwithhdr', 'dolbyvision']
              : [])
          ]
        }
      );
    }

    // Peerflix
    if (presetConfig.peerflix) {
      if (debridService.value !== '' && debridService.value !== 'easydebrid') {
        presetConfig.peerflix.transportUrl = Sqrl.render(
          presetConfig.peerflix.transportUrl,
          {
            transportUrl: peerflixConfig,
            no4k: no4k ? ',remux4k,4k,micro4k' : '',
            sort: debridService.value ? ',size-desc' : ',seed-desc'
          }
        );
        presetConfig.peerflix.manifest.name += ` ${debridServiceName}`;
      }
    }

    // Create addons list
    const selectedAddons = [];

    Object.keys(presetConfig).forEach((key) => {
      selectedAddons.push(presetConfig[key]);
    });

    addons.value = selectedAddons;
  } catch (error) {
    console.error('Error fetching preset config', error);
    addNotification(t('failed_fetching_presets'), 'error');
  } finally {
    isSyncButtonEnabled.value = true;
    isLoadingPreset.value = false;
  }
}

function syncUserAddons() {
  const key = props.stremioAuthKey;
  if (!key) {
    console.error('No auth key provided');
    return;
  }

  isSyncAddons.value = true;
  console.log('Syncing addons...');

  setAddonCollection(addons.value, key)
    .then((data) => {
      if (!('result' in data) || data.result == null) {
        console.error('Sync failed: ', data);
        addNotification(t('failed_syncing_addons', 'error'));
        return;
      } else if (!data.result.success) {
        addNotification(
          data.result.error || t('failed_syncing_addons', 'error')
        );
      } else {
        console.log('Sync complete: + ', data);
        addNotification(t('sync_complete', 'success'));
      }
    })
    .catch((error) => {
      addNotification(error.message || t('failed_syncing_addons', 'error'));
      console.error('Error fetching user addons', error);
    })
    .finally(() => {
      isSyncAddons.value = false;
    });
}

function removeAddon(idx) {
  addons.value.splice(idx, 1);
}

function getNestedObjectProperty(obj, path, defaultValue = null) {
  try {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  } catch (e) {
    return defaultValue;
  }
}

function openEditModal(idx) {
  isEditModalVisible.value = true;
  currentEditIdx.value = idx;
  currentManifest.value = { ...addons.value[idx].manifest };
  document.body.classList.add('modal-open');
}

function closeEditModal() {
  isEditModalVisible.value = false;
  currentManifest.value = {};
  currentEditIdx.value = null;
  document.body.classList.remove('modal-open');
}

function saveManifestEdit(updatedManifest) {
  try {
    addons.value[currentEditIdx.value].manifest = updatedManifest;
    closeEditModal();
  } catch (e) {
    addNotification(t('failed_update_manifest', 'error'));
  }
}

function decodeDataFromTransportUrl(data) {
  return JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
}

function encodeDataFromTransportUrl(data) {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

function getDataTransportUrl(url, base64 = true) {
  const parsedUrl = url.match(
    /(https?:\/\/[^\/]+(?:\/[^\/]+)*\/)([^\/=]+={0,2})(\/manifest\.json)$/
  );

  return {
    domain: parsedUrl[1],
    data: base64
      ? decodeDataFromTransportUrl(parsedUrl[2])
      : JSON.parse(decodeURIComponent(parsedUrl[2])),
    manifest: parsedUrl[3]
  };
}

function getUrlTransportUrl(url, data, base64 = true) {
  return (
    url.domain +
    (base64
      ? encodeDataFromTransportUrl(data)
      : encodeURIComponent(JSON.stringify(data))) +
    url.manifest
  );
}

function updateDebridApiUrl() {
  debridApiUrl.value = debridServiceInfo[debridService.value].url;
}

function isValidApiKey(service) {
  if (!debridApiKey.value) return false;

  const key = String(debridApiKey.value).trim();

  const patterns = {
    alldebrid: /^[a-zA-Z0-9]{20}$/,
    premiumize: /^[a-z0-9]{16}$/i,
    debridlink: /^[A-Za-z0-9]{35}$/i,
    easydebrid: /^[a-zA-Z0-9]{16}$/,
    realdebrid: /^[A-Z0-9]{52}$/,
    torbox: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  };

  return patterns[service].test(key);
}

async function fetchUserData(endpoint) {
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Fetch user data failed:', error);
  }
}

async function encryptUserData(endpoint, data) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(error);
  }
}

function convertToBytes(gb) {
  return Number(gb) * 1024 * 1024 * 1024;
}

function convertToMegabytes(gb) {
  return Number(gb) * 1024;
}
</script>

<template>
  <section id="configure" class="max-w-4xl mx-auto p-4">
    <h3 class="text-2xl font-bold mb-6">
      {{ $t('configure') }}
    </h3>

    <form class="space-y-4" onsubmit="return false;">
      <!-- Step 1: Select Preset -->
      <fieldset class="bg-base-100 p-6 rounded-lg border border-base-300">
        <legend class="text-sm">
          {{ $t('step1_select_preset') }}
        </legend>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
          <label class="label cursor-pointer">
            <input
              type="radio"
              value="minimal"
              v-model="preset"
              class="radio radio-primary"
            />
            <span class="label-text ml-2">{{ $t('minimal') }}</span>
          </label>
          <label class="label cursor-pointer">
            <input
              type="radio"
              value="standard"
              v-model="preset"
              class="radio radio-primary"
            />
            <span class="label-text ml-2">{{ $t('standard') }}</span>
          </label>
          <label class="label cursor-pointer">
            <input
              type="radio"
              value="full"
              v-model="preset"
              class="radio radio-primary"
            />
            <span class="label-text ml-2">{{ $t('full') }}</span>
          </label>
          <label class="label cursor-pointer">
            <input
              type="radio"
              value="kids"
              v-model="preset"
              class="radio radio-primary"
            />
            <span class="label-text ml-2">{{ $t('kids') }}</span>
          </label>
          <label class="label cursor-pointer">
            <input
              type="radio"
              value="factory"
              v-model="preset"
              class="radio radio-primary"
            />
            <span class="label-text ml-2">{{ $t('factory') }}</span>
          </label>
        </div>
      </fieldset>

      <!-- Step 2: Select Language -->
      <fieldset class="bg-base-100 p-6 rounded-lg border border-base-300">
        <legend class="text-sm">
          {{ $t('step2_select_language') }}
        </legend>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          <label class="label cursor-pointer">
            <input
              type="radio"
              value="en"
              v-model="language"
              class="radio radio-primary"
            />
            <span class="label-text ml-2">🇺🇸 {{ $t('english') }}</span>
          </label>
          <label class="label cursor-pointer">
            <input
              type="radio"
              value="es-mx"
              v-model="language"
              class="radio radio-primary"
            />
            <span class="label-text ml-2">🇲🇽 {{ $t('spanish_latino') }}</span>
          </label>
          <label class="label cursor-pointer">
            <input
              type="radio"
              value="es-es"
              v-model="language"
              class="radio radio-primary"
            />
            <span class="label-text ml-2">🇪🇸 {{ $t('spanish_spain') }}</span>
          </label>
          <label class="label cursor-pointer">
            <input
              type="radio"
              value="pt"
              v-model="language"
              class="radio radio-primary"
            />
            <span class="label-text ml-2"
              >🇧🇷 {{ $t('portuguese_brazil') }}</span
            >
          </label>
          <label class="label cursor-pointer">
            <input
              type="radio"
              value="fr"
              v-model="language"
              class="radio radio-primary"
            />
            <span class="label-text ml-2">🇫🇷 {{ $t('french') }}</span>
          </label>
          <label class="label cursor-pointer">
            <input
              type="radio"
              value="it"
              v-model="language"
              class="radio radio-primary"
            />
            <span class="label-text ml-2">🇮🇹 {{ $t('italian') }}</span>
          </label>
          <label class="label cursor-pointer">
            <input
              type="radio"
              value="de"
              v-model="language"
              class="radio radio-primary"
            />
            <span class="label-text ml-2">🇩🇪 {{ $t('german') }}</span>
          </label>
        </div>
      </fieldset>

      <!-- Step 3: Debrid API Key -->
      <fieldset class="bg-base-100 p-6 rounded-lg border border-base-300">
        <legend class="text-sm">
          {{ $t('step3_debrid_api_key') }}
          <a href="#debrid" class="inline-block align-middle">
            <QuestionMarkCircleIcon class="h-5 w-5 text-primary align-middle" />
          </a>
        </legend>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          <label class="label cursor-pointer">
            <input
              type="radio"
              value="realdebrid"
              v-model="debridService"
              @change="updateDebridApiUrl"
              class="radio radio-primary"
            />
            <span class="label-text ml-2">RealDebrid</span>
          </label>
          <label class="label cursor-pointer">
            <input
              type="radio"
              value="alldebrid"
              v-model="debridService"
              @change="updateDebridApiUrl"
              class="radio radio-primary"
            />
            <span class="label-text ml-2">AllDebrid</span>
          </label>
          <label class="label cursor-pointer">
            <input
              type="radio"
              value="premiumize"
              v-model="debridService"
              @change="updateDebridApiUrl"
              class="radio radio-primary"
            />
            <span class="label-text ml-2">Premiumize</span>
          </label>
          <label class="label cursor-pointer">
            <input
              type="radio"
              value="debridlink"
              v-model="debridService"
              @change="updateDebridApiUrl"
              class="radio radio-primary"
            />
            <span class="label-text ml-2">Debrid-Link</span>
          </label>
          <label class="label cursor-pointer">
            <input
              type="radio"
              value="easydebrid"
              v-model="debridService"
              @change="updateDebridApiUrl"
              class="radio radio-primary"
            />
            <span class="label-text ml-2">EasyDebrid</span>
          </label>
          <label class="label cursor-pointer">
            <input
              type="radio"
              value="torbox"
              v-model="debridService"
              @change="updateDebridApiUrl"
              class="radio radio-primary"
            />
            <span class="label-text ml-2">TorBox</span>
          </label>
        </div>
        <div class="form-control w-full">
          <input
            v-model="debridApiKey"
            :disabled="!debridService"
            :class="{ 'input-error': debridApiKey && !isDebridApiKeyValid }"
            type="text"
            class="input input-bordered w-full"
            :placeholder="$t('enter_api_key')"
          />
          <div class="flex justify-between items-center mt-1">
            <span class="label-text-alt">
              <a
                v-if="debridApiUrl"
                target="_blank"
                :href="debridApiUrl"
                class="link link-primary"
              >
                {{ $t('get_api_key_here') }}
              </a>
            </span>
            <span
              v-if="debridApiKey && !isDebridApiKeyValid"
              class="label-text-alt text-error ml-2 text-xs"
            >
              {{ $t('invalid_debrid_api_key') }}
            </span>
          </div>
        </div>
      </fieldset>

      <!-- Step 4: Additional Addons -->
      <fieldset class="bg-base-100 p-6 rounded-lg border border-base-300">
        <legend class="text-sm">
          {{ $t('step4_additional_addons') }}
        </legend>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          <label class="label cursor-pointer">
            <input
              type="checkbox"
              value="kitsu"
              v-model="extras"
              class="checkbox checkbox-primary"
            />
            <span class="label-text ml-2">Anime Kitsu</span>
          </label>
          <label class="label cursor-pointer">
            <input
              type="checkbox"
              value="usatv"
              v-model="extras"
              class="checkbox checkbox-primary"
            />
            <span class="label-text ml-2">USA TV</span>
          </label>
          <label class="label cursor-pointer">
            <input
              type="checkbox"
              value="argentinatv"
              v-model="extras"
              class="checkbox checkbox-primary"
            />
            <span class="label-text ml-2">Argentina TV</span>
          </label>
          <label class="label cursor-pointer">
            <input
              type="checkbox"
              value="streamasia"
              v-model="extras"
              class="checkbox checkbox-primary"
            />
            <span class="label-text ml-2">StreamAsia</span>
          </label>
          <label class="label cursor-pointer">
            <input
              type="checkbox"
              value="stremthrustore"
              :disabled="!isDebridApiKeyValid"
              v-model="extras"
              class="checkbox checkbox-primary"
            />
            <span class="label-text ml-2">StremThru Store</span>
          </label>
        </div>
      </fieldset>

      <!-- Step 5: Additional Options -->
      <fieldset class="bg-base-100 p-6 rounded-lg border border-base-300">
        <legend class="text-sm">
          {{ $t('step5_additional_options') }}
        </legend>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          <label class="label cursor-pointer">
            <input
              type="checkbox"
              value="no4k"
              v-model="options"
              class="checkbox checkbox-primary"
            />
            <span class="label-text ml-2">{{ $t('no_4k') }}</span>
          </label>
          <label class="label cursor-pointer">
            <input
              type="checkbox"
              value="cached"
              v-model="options"
              :disabled="!isDebridApiKeyValid"
              class="checkbox checkbox-primary"
            />
            <span class="label-text ml-2">{{ $t('cached_only_debrid') }}</span>
          </label>
          <label class="label cursor-pointer">
            <span class="label-text">{{ $t('max_size') }}</span>
            <select v-model="maxSize" class="select select-bordered w-32">
              <option :value="''">{{ $t('no_size_limit') }}</option>
              <option
                v-for="size in [2, 5, 10, 15, 20, 25, 30]"
                :key="size"
                :value="size"
              >
                {{ size }} GB
              </option>
            </select>
          </label>
        </div>
      </fieldset>

      <!-- Step 6: RPDB Key -->
      <fieldset class="bg-base-100 p-6 rounded-lg border border-base-300">
        <legend class="text-sm">
          {{ $t('step6_rpdb_key') }}
          <a
            target="_blank"
            href="https://ratingposterdb.com"
            class="inline-block align-middle"
          >
            <QuestionMarkCircleIcon class="h-5 w-5 text-primary align-middle" />
          </a>
        </legend>
        <input
          v-model="rpdbKey"
          class="input input-bordered w-full"
          :placeholder="$t('enter_rpdb_key')"
        />
      </fieldset>

      <!-- Step 7: Load Preset -->
      <fieldset class="bg-base-100 p-6 rounded-lg border border-base-300">
        <legend class="text-sm">
          {{ $t('step7_load_preset') }}
        </legend>
        <button
          class="btn btn-primary"
          @click="loadUserAddons"
          :disabled="
            !props.stremioAuthKey ||
            (debridService ? !isDebridApiKeyValid : false) ||
            isLoadingPreset
          "
        >
          <span
            v-if="isLoadingPreset"
            class="loading loading-spinner loading-sm"
          ></span>
          {{
            isLoadingPreset ? $t('loading_addons') : $t('load_addons_preset')
          }}
        </button>
      </fieldset>

      <!-- Step 8: Customize Addons -->
      <fieldset class="bg-base-100 p-6 rounded-lg border border-base-300">
        <legend class="text-sm">
          {{ $t('step8_customize_addons') }}
        </legend>
        <draggable
          :list="addons"
          item-key="transportUrl"
          class="space-y-2"
          ghost-class="opacity-50"
          @start="dragging = true"
          @end="dragging = false"
        >
          <template #item="{ element, index }">
            <AddonItem
              :name="element.manifest.name"
              :idx="index"
              :manifestURL="element.transportUrl"
              :logoURL="element.manifest.logo"
              :isDeletable="
                !getNestedObjectProperty(element, 'flags.protected', false)
              "
              :isConfigurable="
                getNestedObjectProperty(
                  element,
                  'manifest.behaviorHints.configurable',
                  false
                )
              "
              @delete-addon="removeAddon"
              @edit-manifest="openEditModal"
            />
          </template>
        </draggable>
      </fieldset>

      <!-- Step 9: Bootstrap Account -->
      <fieldset class="bg-base-100 p-6 rounded-lg border border-base-300">
        <legend class="text-sm">
          {{ $t('step9_bootstrap_account') }}
        </legend>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!isSyncButtonEnabled || isLoadingPreset || isSyncAddons"
          @click="syncUserAddons"
        >
          <span
            v-if="isSyncAddons"
            class="loading loading-spinner loading-sm"
          ></span>
          {{ isSyncAddons ? $t('sync_addons') : $t('sync_to_stremio') }}
        </button>
      </fieldset>
    </form>
  </section>

  <!-- Edit Modal -->
  <dialog v-if="isEditModalVisible" class="modal modal-open">
    <div class="modal-box w-11/12 max-w-5xl">
      <h3 class="font-bold text-lg mb-4">{{ $t('edit_manifest') }}</h3>
      <DynamicForm
        :manifest="currentManifest"
        @update-manifest="saveManifestEdit"
      />
      <div class="modal-action">
        <button class="btn" @click="closeEditModal">{{ $t('close') }}</button>
      </div>
    </div>
  </dialog>
</template>
