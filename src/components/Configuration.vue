<script setup>
import { ref, computed } from 'vue';
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

function loadUserAddons() {
  const key = props.stremioAuthKey;
  if (!key) {
    console.error('No auth key provided');
    return;
  }

  console.log('Loading addons...');

  fetch('/preset.json')
    .then((resp) => {
      resp.json().then(async (data) => {
        if (!data) {
          console.error('Failed to fetch presets: ', data);
          alert(t('failed_fetching_presets'));
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
        let streamAsiaTransportUrl = {};
        const mediaFusionConfig = data.mediafusionConfig;
        const aiolistsConfig =
          preset.value === 'kids'
            ? data.aiolistsKidsConfig
            : data.aiolistsConfig;

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
        size = options.value.maxSize ? options.value.maxSize : '';

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
          cometTransportUrl = getDataTransportUrl(
            presetConfig.comet.transportUrl
          );
          presetConfig.comet.transportUrl = getUrlTransportUrl(
            cometTransportUrl,
            {
              ...cometTransportUrl.data,
              maxResultsPerResolution: limit,
              maxSize: size ? convertToBytes(size) : 0,
              resolutions: {
                ...cometTransportUrl.data.resolutions,
                r2160p: no4k ? false : true
              }
            }
          );
        }

        // MediaFusion
        if (presetConfig.mediafusion) {
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
                  ? [
                      '4k',
                      'brremux',
                      'hdrall',
                      'dolbyvisionwithhdr',
                      'dolbyvision'
                    ]
                  : [])
              ]
            }
          );
        }

        // Peerflix
        if (presetConfig.peerflix) {
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
      });
    })
    .catch((error) => {
      console.error('Error fetching preset config', error);
    })
    .finally(() => {
      isSyncButtonEnabled.value = true;
    });
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
  <section id="configure">
    <h2>{{ $t('configure') }}</h2>
    <form onsubmit="return false;">
      <fieldset id="form_step1">
        <legend>{{ $t('step1_select_preset') }}</legend>
        <div>
          <label>
            <input type="radio" value="minimal" v-model="preset" />
            {{ $t('minimal') }}
          </label>
          <label>
            <input type="radio" value="standard" v-model="preset" />
            {{ $t('standard') }}
          </label>
          <label>
            <input type="radio" value="full" v-model="preset" />
            {{ $t('full') }}
          </label>
          <label>
            <input type="radio" value="kids" v-model="preset" />
            {{ $t('kids') }}
          </label>
          <label>
            <input type="radio" value="factory" v-model="preset" />
            {{ $t('factory') }}
          </label>
        </div>
      </fieldset>
      <fieldset id="form_step2">
        <legend>{{ $t('step2_select_language') }}</legend>
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
        </div>
      </fieldset>
      <fieldset id="form_step3">
        <legend>{{ $t('step3_debrid_api_key') }} <a href="#faq">(?)</a></legend>
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
            <input
              v-model="debridApiKey"
              :disabled="!debridService"
              :class="{ 'bd-error': debridApiKey && !isDebridApiKeyValid }"
              :aria-invalid="
                debridApiKey ? (!isDebridApiKeyValid).toString() : 'false'
              "
              type="text"
            />
            <a v-if="debridApiUrl" target="_blank" :href="`${debridApiUrl}`">{{
              $t('get_api_key_here')
            }}</a>
            <small
              v-if="debridApiKey && !isDebridApiKeyValid"
              class="text-error pull-right"
            >
              {{ $t('invalid_debrid_api_key') }}
            </small>
          </label>
        </div>
      </fieldset>
      <fieldset id="form_step4">
        <legend>{{ $t('step4_additional_addons') }}</legend>
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
      <fieldset id="form_step5">
        <legend>{{ $t('step5_additional_options') }}</legend>
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
              :disabled="!isDebridApiKeyValid"
            />
            {{ $t('cached_only_debrid') }}
          </label>
          <label>
            <select v-model="options.maxSize" class="max-size-select">
              <option :value="''">{{ $t('no_size_limit') }}</option>
              <option
                v-for="size in [2, 5, 10, 15, 20, 25, 30]"
                :key="size"
                :value="size"
              >
                {{ size }} GB
              </option>
            </select>
            {{ $t('max_size') }}
          </label>
        </div>
      </fieldset>
      <fieldset id="form_step6">
        <legend>
          {{ $t('step6_rpdb_key') }}
          <a target="_blank" href="https://ratingposterdb.com">(?)</a>
        </legend>
        <div>
          <label>
            <input v-model="rpdbKey" />
          </label>
        </div>
      </fieldset>
      <fieldset id="form_step7">
        <legend>{{ $t('step7_load_preset') }}</legend>
        <button
          class="button secondary"
          @click="loadUserAddons"
          :disabled="
            !props.stremioAuthKey ||
            (debridService ? !isDebridApiKeyValid : false)
          "
        >
          {{ $t('load_addons_preset') }}
        </button>
      </fieldset>
      <fieldset id="form_step8">
        <legend>{{ $t('step8_customize_addons') }}</legend>
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
      </fieldset>
      <fieldset id="form_step9">
        <legend>{{ $t('step9_bootstrap_account') }}</legend>
        <button
          type="button"
          class="button secondary icon"
          :disabled="!isSyncButtonEnabled"
          @click="syncUserAddons"
        >
          {{ $t('sync_to_stremio') }}
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
  background-color: #ffa600;
  color: white;
  font-size: 16px;
  cursor: pointer;
  border-radius: 5px;
}

.max-size-select {
  font-size: 1em;
  padding: 6px 16px;
  border-radius: 4px;
  max-width: 120px;
  margin: 0 8px;
  display: inline-block;
}
</style>
