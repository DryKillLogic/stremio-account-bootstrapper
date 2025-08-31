<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Buffer } from 'buffer';
import draggable from 'vuedraggable';
import AddonItem from './AddonItem.vue';
import DynamicForm from './DynamicForm.vue';
import _ from 'lodash';
import { setAddonCollection } from '../composables/useStremioApi';

const { t } = useI18n();

const props = defineProps({
  stremioAuthKey: { type: String }
});

let dragging = false;

let addons = ref([]);
let extras = ref([]);
let options = ref([]);
let isSyncButtonEnabled = ref(false);
let language = ref('en');

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

let torrentioConfig = '';
let peerflixConfig = '';
let rpdbKey = ref('');
let isEditModalVisible = ref(false);
let currentManifest = ref({});
let currentEditIdx = ref(null);
let isPasteModalOpen = ref(false);
let customJsonUrl = ref('');
let advancedVisible = ref(false);
let isLoading = ref(false);

async function loadUserAddons() {
  const key = props.stremioAuthKey;
  if (!key) {
    console.error('No auth key provided');
    return;
  }

  console.log('Loading addons...');
  isLoading.value = true;

  try {
    const resp = await fetch('/preset.json');
    const data = await resp.json();

    if (!data.addons) {
      console.error('Failed to fetch presets: ', data);
      alert(t('failed_fetching_presets'));
      isLoading.value = false;
      return;
    }

    let presetConfig = {};
    let no4k = false;
    let cached = false;
    let cometTransportUrl = {};
    let jackettioTransportUrl = {};
    let torrentsdbTransportUrl = {};
    let streamAsiaTransportUrl = {};
    const mediaFusionConfig = data.mediafusionConfig;
    const aiolistsConfig = data.aiolistsConfig;

    // Set addons config based on language
    if (language.value === 'factory') {
      presetConfig = data.factory;
    } else if (language.value === 'en') {
      presetConfig = data.addons;
    } else {
      presetConfig = _.merge({}, data.addons, data[language.value]);
    }

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

    // Set AIOLists options
    aiolistsConfig.config.tmdbLanguage = language.value;

    // Set language lists
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

    // Set options for debrid
    if (isValidApiKey()) {
      debridServiceName = debridServiceInfo[debridService.value].name;

      // Torrentio
      torrentioConfig = `|sort=qualitysize|debridoptions=${cached ? 'nodownloadlinks,' : ''}nocatalog|${debridService.value}=${debridApiKey.value}`;

      // Comet
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

      // MediaFusion
      presetConfig.mediafusion.manifest.name += ` | ${debridServiceName}`;
      mediaFusionConfig.streaming_provider = {
        service: debridService.value,
        token: debridApiKey.value,
        enable_watchlist_catalogs: false,
        download_via_browser: false,
        only_show_cached_streams: cached
      };

      // TorrentsDB
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

      // Jackettio
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

      // Peerflix
      if (debridService.value !== 'easydebrid') {
        peerflixConfig = `%7Cdebridoptions=nocatalog${cached ? ',nodownloadlinks' : ''}%7C${debridService.value}=${debridApiKey.value}`;
      } else {
        presetConfig = _.omit(presetConfig, 'peerflix');
      }

      // Torbox
      if (debridService.value === 'torbox') {
        presetConfig.torbox.transportUrl = Sqrl.render(
          presetConfig.torbox.transportUrl,
          { transportUrl: debridApiKey.value }
        );
      } else {
        presetConfig = _.omit(presetConfig, 'torbox');
      }

      // StreamAsia
      if (debridService.value !== 'easydebrid' && presetConfig.streamasia) {
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
                debridProvider:
                  streamAsiaDebridService[debridService.value],
                token: debridApiKey.value
              }
            ]
          }
        );
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
    if (language.value !== 'factory') {
      // Torrentio
      presetConfig.torrentio.transportUrl = Sqrl.render(
        presetConfig.torrentio.transportUrl,
        { transportUrl: torrentioConfig, no4k: no4k ? '4k,' : '' }
      );
      presetConfig.torrentio.manifest.name += ` ${debridServiceName}`;

      // Comet
      if (no4k) {
        cometTransportUrl = getDataTransportUrl(
          presetConfig.comet.transportUrl
        );
        presetConfig.comet.transportUrl = getUrlTransportUrl(
          cometTransportUrl,
          {
            ...cometTransportUrl.data,
            resolutions: {
              ...cometTransportUrl.data.resolutions,
              r2160p: false
            }
          }
        );
      }

      // MediaFusion
      if (no4k) {
        _.pull(
          mediaFusionConfig.selected_resolutions,
          '4k',
          '2160p',
          '1440p'
        );
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

      // TorrentsDB
      if (no4k) {
        torrentsdbTransportUrl = getDataTransportUrl(
          presetConfig.torrentsdb.transportUrl
        );
        presetConfig.torrentsdb.transportUrl = getUrlTransportUrl(
          torrentsdbTransportUrl,
          {
            ...torrentsdbTransportUrl.data,
            qualityfilter: [
              ...torrentsdbTransportUrl.data.qualityfilter,
              '4k',
              'brremux',
              'hdrall',
              'dolbyvisionwithhdr',
              'dolbyvision'
            ]
          }
        );
      }

      // Peerflix
      if (
        debridService.value !== '' &&
        debridService.value !== 'easydebrid'
      ) {
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
  } finally {
    isLoading.value = false;
    isSyncButtonEnabled.value = true;
  }
}

function syncUserAddons() {
  const key = props.stremioAuthKey;
  if (!key) {
    console.error('No auth key provided');
    return;
  }
  console.log('Syncing addons...');

  setAddonCollection(addons.value, key)
    .then((data) => {
      if (!('result' in data) || data.result == null) {
        console.error('Sync failed: ', data);
        alert(t('failed_syncing_addons'));
        return;
      } else if (!data.result.success) {
        alert(data.result.error || t('failed_syncing_addons'));
      } else {
        console.log('Sync complete: + ', data);
        alert(t('sync_complete'));
      }
    })
    .catch((error) => {
      alert(error.message || t('failed_syncing_addons'));
      console.error('Error fetching user addons', error);
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
    alert(t('failed_update_manifest'));
  }
}

function decodeDataFromTransportUrl(data) {
  return JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
}

function encodeDataFromTransportUrl(data) {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

function getDataTransportUrl(url, base64 = true) {
  const parsedUrl = url.match(/(https?:\/\/[^\/]+\/)([^\/]+)(\/[^\/]+)$/);

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

function isValidApiKey() {
  if (debridApiKey.value) {
    return /^[a-zA-Z0-9-]+$/.test(debridApiKey.value);
  }

  return false;
}

function openPasteModal() {
  isPasteModalOpen.value = true;
}

function closePasteModal() {
  isPasteModalOpen.value = false;
  customJsonUrl.value = '';
}

async function addCustomJsonAddon() {
  isLoading.value = true;
  try {
    const response = await fetch(customJsonUrl.value);
    const parsedJson = await response.json();

    // Validate the parsed JSON
    if (!parsedJson.id || !parsedJson.name || !parsedJson.version) {
      throw new Error('Invalid JSON structure');
    }

    addons.value.push({
      transportUrl: customJsonUrl.value,
      manifest: parsedJson
    });
    closePasteModal();
  } catch (error) {
    alert('Invalid JSON URL or JSON content: ' + error.message);
  } finally {
    isLoading.value = false;
  }
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
</script>

<template>
  <section id="configure">
    <h2>{{ $t('configure') }}</h2>
    <form onsubmit="return false;">
      <fieldset id="form_step1">
        <legend>{{ $t('step1_select_preset') }}</legend>
        <div>
          <label>
            <input type="radio" value="en" v-model="language" />
            🇺🇸 {{ $t('english') }}
          </label>
          <label>
            <input type="radio" value="es-mx" v-model="language" />
            🇲🇽 {{ $t('spanish_latino') }}
          </label>
          <label>
            <input type="radio" value="es-es" v-model="language" />
            🇪🇸 {{ $t('spanish_spain') }}
          </label>
          <label>
            <input type="radio" value="pt" v-model="language" />
            🇧🇷 {{ $t('portuguese_brazil') }}
          </label>
          <label>
            <input type="radio" value="fr" v-model="language" />
            🇫🇷 {{ $t('french') }}
          </label>
          <label>
            <input type="radio" value="it" v-model="language" />
            🇮🇹 {{ $t('italian') }}
          </label>
          <label>
            <input type="radio" value="de" v-model="language" />
            🇩🇪 {{ $t('german') }}
          </label>
          <label>
            <input type="radio" value="factory" v-model="language" />
            🏭 {{ $t('factory') }}
          </label>
        </div>
      </fieldset>
      <fieldset id="form_step2">
        <legend>{{ $t('step2_debrid_api_key') }} <a href="#faq">(?)</a></legend>
        <div>
          <label>
            <input
              type="radio"
              value="realdebrid"
              v-model="debridService"
              @change="updateDebridApiUrl"
            />
            RealDebrid
          </label>
          <label>
            <input
              type="radio"
              value="alldebrid"
              v-model="debridService"
              @change="updateDebridApiUrl"
            />
            AllDebrid
          </label>
          <label>
            <input
              type="radio"
              value="premiumize"
              v-model="debridService"
              @change="updateDebridApiUrl"
            />
            Premiumize
          </label>
          <label>
            <input
              type="radio"
              value="debridlink"
              v-model="debridService"
              @change="updateDebridApiUrl"
            />
            Debrid-Link
          </label>
          <label>
            <input
              type="radio"
              value="easydebrid"
              v-model="debridService"
              @change="updateDebridApiUrl"
            />
            EasyDebrid
          </label>
          <label>
            <input
              type="radio"
              value="torbox"
              v-model="debridService"
              @change="updateDebridApiUrl"
            />
            TorBox
          </label>
          <label>
            <input v-model="debridApiKey" :disabled="!debridService" />
            <a v-if="debridApiUrl" target="_blank" :href="`${debridApiUrl}`">{{
              $t('get_api_key_here')
            }}</a>
          </label>
        </div>
      </fieldset>
      <fieldset id="form_step3">
        <legend>{{ $t('step3_additional_addons') }}</legend>
        <div>
          <label>
            <input type="checkbox" value="kitsu" v-model="extras" />
            Anime Kitsu
          </label>
          <label>
            <input type="checkbox" value="usatv" v-model="extras" />
            USA TV
          </label>
          <label>
            <input type="checkbox" value="argentinatv" v-model="extras" />
            Argentina TV
          </label>
          <label>
            <input type="checkbox" value="streamasia" v-model="extras" />
            StreamAsia
          </label>
        </div>
      </fieldset>
      <fieldset id="form_step4">
        <legend>{{ $t('step4_additional_options') }}</legend>
        <div>
          <label>
            <input type="checkbox" value="no4k" v-model="options" />
            {{ $t('no_4k') }}
          </label>
          <label>
            <input
              type="checkbox"
              value="cached"
              v-model="options"
              :disabled="!debridApiKey"
            />
            {{ $t('cached_only_debrid') }}
          </label>
        </div>
      </fieldset>
      <fieldset id="form_step5">
        <legend>
          {{ $t('step5_rpdb_key') }}
          <a target="_blank" href="https://ratingposterdb.com">(?)</a>
        </legend>
        <div>
          <label>
            <input v-model="rpdbKey" />
          </label>
        </div>
      </fieldset>
      <fieldset id="form_step6">
        <legend>{{ $t('step6_load_preset') }}</legend>
        <button
          class="button secondary"
          @click="loadUserAddons"
          :disabled="!stremioAuthKey || isLoading"
        >
          <span v-if="!isLoading">{{ $t('load_addons_preset') }}</span>
          <span v-else>Loading...</span>
        </button>
      </fieldset>
      <fieldset id="form_step7">
        <legend>{{ $t('step7_customize_addons') }}</legend>
        <draggable
          :list="addons"
          item-key="transportUrl"
          class="sortable-list"
          ghost-class="ghost"
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
        <div>
          <button :disabled="!isSyncButtonEnabled" @click="advancedVisible = !advancedVisible">
            {{ advancedVisible ? 'Hide Advanced Options' : 'Show Advanced Options' }}
          </button>
          <div v-if="advancedVisible">
            <input v-model="customJsonUrl" :placeholder="$t('step7_add_custom_addons')" />
            <button @click="addCustomJsonAddon">Add Addon</button>
          </div>
        </div>
      </fieldset>
      <fieldset id="form_step8">
        <legend>{{ $t('step8_bootstrap_account') }}</legend>
        <button
          type="button"
          class="button secondary icon"
          :disabled="!isSyncButtonEnabled"
          @click="syncUserAddons"
        >
          {{ $t('sync_to_stremio') }}
          <img
            src="https://icongr.am/feather/loader.svg?size=16&amp;color=ffffff"
            alt="icon"
          />
        </button>
      </fieldset>
    </form>
  </section>

  <div v-if="isEditModalVisible" class="modal" @click.self="closeEditModal">
    <div class="modal-content">
      <h3>{{ $t('edit_manifest') }}</h3>
      <DynamicForm
        :manifest="currentManifest"
        @update-manifest="saveManifestEdit"
      />
    </div>
  </div>

  <div v-if="isLoading" class="loading-screen">
    <div class="spinner"></div>
  </div>
</template>

<style scoped>
.sortable-list {
  padding: 25px;
  border-radius: 7px;
  padding: 30px 25px 20px;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
}

.item.dragging {
  opacity: 0.6;
}

.item.dragging :where(.details, i) {
  opacity: 0;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;
}

.modal-content {
  background: #2e2e2e;
  color: #e0e0e0;
  width: 75vw;
  max-width: 900px;
  max-height: 90vh;
  padding: 20px;
  border-radius: 5px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.7);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

button {
  padding: 10px 20px;
  border: none;
  background-color: #7b5bf5;
  color: white;
  font-size: 16px;
  cursor: pointer;
  border-radius: 5px;
}

.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1001;
}

.spinner {
  border: 16px solid #f3f3f3;
  border-top: 16px solid gray;
  border-radius: 50%;
  width: 120px;
  height: 120px;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
