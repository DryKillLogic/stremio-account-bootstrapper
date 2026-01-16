<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Buffer } from 'buffer';
import draggable from 'vuedraggable';
import AddonItem from './AddonItem.vue';
import DynamicForm from './DynamicForm.vue';
import _ from 'lodash';
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/outline';
import { addNotification } from '../composables/useNotifications';
import { useAnalytics } from '../composables/useAnalytics';
import { isValidApiKey, debridServicesInfo } from '../utils/debrid.ts';
import { isValidManifestUrl } from '../utils/url.ts';
import {
  buildPresetService,
  loadPresetService
} from '../services/presetService.ts';

const { t } = useI18n();

const props = defineProps({
  stremioAuthKey: { type: String }
});

let dragging = false;
let addons = ref([]);
let customAddons = ref(['']);
let extras = ref([]);
let options = ref([]);
let maxSize = ref('');
let isSyncButtonEnabled = ref(false);
let isLoadingPreset = ref(false);
let isSyncAddons = ref(false);
let language = ref('en');
let preset = ref('standard');

let debridService = ref('');
let debridApiKey = ref(null);
let debridApiUrl = ref('');
let debridServiceName = '';

const MAX_CUSTOM_ADDONS = 10;
const canAddCustom = computed(
  () => customAddons.value.length < MAX_CUSTOM_ADDONS
);

const isDebridApiKeyValid = computed(() =>
  isValidApiKey(debridService.value, debridApiKey.value)
);

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
    const {
      selectedAddons,
      presetConfig: builtPresetConfig,
      debridServiceName: builtDebridServiceName,
      torrentioConfig: builtTorrentioConfig,
      peerflixConfig: builtPeerflixConfig
    } = await buildPresetService({
      preset: preset.value,
      language: language.value,
      extras: extras.value,
      customAddons: customAddons.value,
      options: options.value,
      maxSize: maxSize.value,
      rpdbKey: rpdbKey.value,
      debridService: debridService.value,
      debridApiKey: debridApiKey.value,
      isDebridApiKeyValid: isDebridApiKeyValid.value
    });

    addons.value = selectedAddons;
    debridServiceName = builtDebridServiceName;
    torrentioConfig = builtTorrentioConfig;
    peerflixConfig = builtPeerflixConfig;
  } catch (error) {
    console.error('Error fetching preset config', error);
    addNotification(t('failed_fetching_presets'), 'error');
  } finally {
    isSyncButtonEnabled.value = true;
    isLoadingPreset.value = false;
  }
}

async function syncUserAddons() {
  const { track } = useAnalytics();
  const key = props.stremioAuthKey;
  if (!key) {
    console.error('No auth key provided');
    return;
  }

  isSyncAddons.value = true;
  console.log('Syncing addons...');

  try {
    const data = await loadPresetService({ addons: addons.value, key });
    addNotification(t('sync_complete'), 'success');
    track('sync_stremio_click', {
      title: 'Sync to Stremio',
      vars: {
        language: language.value,
        preset: preset.value,
        debrid: debridService.value || ''
      }
    });
    console.log('Sync complete: ', data);
  } catch (error) {
    addNotification(error.message || t('failed_syncing_addons', 'error'));
    console.error('Sync failed', error);
  } finally {
    isSyncAddons.value = false;
  }
}

function removeAddon(idx) {
  addons.value.splice(idx, 1);
}

// functions to manage dynamic custom inputs
function addCustomAddon() {
  if (!canAddCustom.value) return;
  customAddons.value.push('');
}

function removeCustomAddon(idx) {
  if (idx === 0) return;
  customAddons.value.splice(idx, 1);
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

function updateDebridApiUrl() {
  debridApiUrl.value = debridServicesInfo[debridService.value].url;
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
              value="no_streams"
              v-model="preset"
              class="radio radio-primary"
            />
            <span class="label-text ml-2">{{ $t('no_streams') }}</span>
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
              value="es-MX"
              v-model="language"
              class="radio radio-primary"
            />
            <span class="label-text ml-2">🇲🇽 {{ $t('spanish_latino') }}</span>
          </label>
          <label class="label cursor-pointer">
            <input
              type="radio"
              value="es-ES"
              v-model="language"
              class="radio radio-primary"
            />
            <span class="label-text ml-2">🇪🇸 {{ $t('spanish_spain') }}</span>
          </label>
          <label class="label cursor-pointer">
            <input
              type="radio"
              value="pt-BR"
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
          <label class="label cursor-pointer">
            <input
              type="radio"
              value="nl"
              v-model="language"
              class="radio radio-primary"
            />
            <span class="label-text ml-2">🇱🇺 {{ $t('dutch') }}</span>
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

      <!-- Step 5: Custom Addons -->
      <fieldset class="bg-base-100 p-6 rounded-lg border border-base-300">
        <legend class="text-sm">
          {{ $t('step5_custom_addons') }}
        </legend>
        <div class="space-y-3">
          <div
            v-for="(url, idx) in customAddons"
            :key="idx"
            class="flex items-center gap-2"
          >
            <input
              v-model="customAddons[idx]"
              type="text"
              class="input input-bordered flex-1"
              :class="{
                'input-error': url && !isValidManifestUrl(url)
              }"
              :placeholder="$t('custom_addon_url')"
            />
            <button
              type="button"
              class="btn btn-sm btn-error text-white"
              @click="removeCustomAddon(idx)"
              :aria-label="$t('remove')"
              :disabled="idx === 0"
              :class="{ 'opacity-50 cursor-not-allowed': idx === 0 }"
            >
              −
            </button>
          </div>

          <div class="flex justify-end items-center gap-2">
            <button
              type="button"
              class="btn btn-primary"
              @click="addCustomAddon"
              :disabled="
                !canAddCustom ||
                !isValidManifestUrl(customAddons[customAddons.length - 1])
              "
            >
              +
            </button>
          </div>
        </div>
      </fieldset>

      <!-- Step 6: Additional Options -->
      <fieldset class="bg-base-100 p-6 rounded-lg border border-base-300">
        <legend class="text-sm">
          {{ $t('step6_additional_options') }}
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

      <!-- Step 7: RPDB Key -->
      <fieldset class="bg-base-100 p-6 rounded-lg border border-base-300">
        <legend class="text-sm">
          {{ $t('step7_rpdb_key') }}
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

      <!-- Step 8: Load Preset -->
      <fieldset class="bg-base-100 p-6 rounded-lg border border-base-300">
        <legend class="text-sm">
          {{ $t('step8_load_preset') }}
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

      <!-- Step 9: Customize Addons -->
      <fieldset class="bg-base-100 p-6 rounded-lg border border-base-300">
        <legend class="text-sm">
          {{ $t('step9_customize_addons') }}
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

      <!-- Step 10: Bootstrap Account -->
      <fieldset class="bg-base-100 p-6 rounded-lg border border-base-300">
        <legend class="text-sm">
          {{ $t('step10_bootstrap_account') }}
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
      <button
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="closeEditModal"
      >
        ✕
      </button>
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
