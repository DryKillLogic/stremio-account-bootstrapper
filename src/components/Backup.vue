<script setup>
import { computed, ref, watch } from 'vue';
import {
  getAddonCollection,
  pullProfiles,
  setAddonCollection
} from '../api/platformApi';
import { format } from 'date-fns';
import { useI18n } from 'vue-i18n';
import { addNotification } from '../composables/useNotifications';
import { useAnalytics } from '../composables/useAnalytics';

const { authKey, platform } = defineProps({
  authKey: { type: String },
  platform: {
    type: String,
    default: 'stremio'
  }
});

const { t } = useI18n();
const loadingBackup = ref(false);
const loadingRestore = ref(false);
const error = ref(null);
const fileInputRef = ref(null);
const { track } = useAnalytics();
const nuvioProfiles = ref([]);
const selectedNuvioProfileId = ref(1);
const isLoadingNuvioProfiles = ref(false);

const selectedNuvioProfileName = computed(() => {
  const profile = nuvioProfiles.value.find(
    (item) => item.id === selectedNuvioProfileId.value
  );
  return (
    profile?.name ||
    t('profile_fallback_name', { id: selectedNuvioProfileId.value })
  );
});

function resetNuvioProfiles() {
  nuvioProfiles.value = [];
  selectedNuvioProfileId.value = 1;
}

async function loadNuvioProfiles() {
  if (platform !== 'nuvio' || !authKey) {
    resetNuvioProfiles();
    return;
  }

  isLoadingNuvioProfiles.value = true;
  try {
    const response = await pullProfiles(authKey);
    const profiles = Array.isArray(response)
      ? response
          .map((profile) => {
            const id = Number(profile?.profile_index);
            return Number.isFinite(id)
              ? {
                  id,
                  name: profile?.name || t('profile_fallback_name', { id })
                }
              : null;
          })
          .filter(Boolean)
      : [];

    nuvioProfiles.value = profiles;
    if (
      profiles.length > 0 &&
      !profiles.some(
        (profile) => profile.id === selectedNuvioProfileId.value
      )
    ) {
      selectedNuvioProfileId.value = profiles[0].id;
    }
  } catch (e) {
    console.error('Failed to load profiles', e);
    resetNuvioProfiles();
    addNotification(t('profile_load_failed'), 'error');
  } finally {
    isLoadingNuvioProfiles.value = false;
  }
}

watch(() => [platform, authKey], loadNuvioProfiles, { immediate: true });

function backupConfig() {
  loadingBackup.value = true;
  error.value = null;

  getAddonCollection(platform, authKey, selectedNuvioProfileId.value)
    .then((data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const profileSuffix =
        platform === 'nuvio' ? `-profile-${selectedNuvioProfileId.value}` : '';
      a.download = `${platform}-addons-config${profileSuffix}-${format(
        new Date(),
        'yyyy-MM-dd_HH-mm-ss'
      )}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      addNotification(t('backup_saved'), 'success');
      track('backup_config_click', {
        title: `Backup config (${platform}${
          platform === 'nuvio' ? `: ${selectedNuvioProfileName.value}` : ''
        })`
      });
    })
    .catch((e) => {
      error.value = e?.message || String(e);
      addNotification(error.value || t('backup_failed'), 'error');
    })
    .finally(() => {
      loadingBackup.value = false;
    });
}

function openFilePicker() {
  if (!authKey) return;
  fileInputRef.value?.click();
}

async function restoreConfigFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!authKey) {
    event.target.value = '';
    return;
  }

  loadingRestore.value = true;
  error.value = null;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    const addonsPayload =
      parsed?.result?.addons ?? (Array.isArray(parsed) ? parsed : null);

    if (!addonsPayload) {
      addNotification(t('invalid_backup_file'), 'error');
      throw new Error(t('invalid_backup_file'));
    }

    await setAddonCollection(
      platform,
      addonsPayload,
      authKey,
      selectedNuvioProfileId.value
    );
    addNotification(t('restore_successful'), 'success');
    track('restore_config_click', {
      title: `Restore config (${platform}${
        platform === 'nuvio' ? `: ${selectedNuvioProfileName.value}` : ''
      })`
    });
  } catch (e) {
    error.value = e?.message || String(e);
    addNotification(error.value || t('restore_failed'), 'error');
  } finally {
    loadingRestore.value = false;
    event.target.value = '';
  }
}
</script>

<template>
  <section id="backup" class="max-w-4xl mx-auto p-4">
    <h2 class="text-2xl font-bold mb-6">{{ $t('backup_restore') }}</h2>

    <div class="bg-base-100 p-6 rounded-lg border border-base-300">
      <label
        v-if="platform === 'nuvio'"
        class="label cursor-pointer mb-4"
      >
        <span class="label-text">{{ $t('profile_label') }}</span>
        <select
          v-model.number="selectedNuvioProfileId"
          class="select select-bordered w-40 mr-4"
          :disabled="isLoadingNuvioProfiles || nuvioProfiles.length === 0"
        >
          <option v-if="isLoadingNuvioProfiles" :value="1">
            {{ $t('profile_loading') }}
          </option>
          <option
            v-for="profile in nuvioProfiles"
            :key="profile.id"
            :value="profile.id"
          >
            {{ profile.name }}
          </option>
        </select>
      </label>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <button
            class="btn btn-primary w-full"
            @click="backupConfig"
            :disabled="!authKey || loadingBackup"
          >
            <span
              v-if="loadingBackup"
              class="loading loading-spinner loading-sm"
            ></span>
            {{ loadingBackup ? $t('backing_up') : $t('backup_config') }}
          </button>
        </div>

        <div>
          <button
            class="btn btn-secondary w-full"
            @click="openFilePicker"
            :disabled="!authKey || loadingRestore"
          >
            <span
              v-if="loadingRestore"
              class="loading loading-spinner loading-sm"
            ></span>
            {{ loadingRestore ? $t('restoring') : $t('restore_config') }}
          </button>

          <input
            ref="fileInputRef"
            type="file"
            accept=".json,application/json"
            @change="restoreConfigFile"
            class="hidden"
            :disabled="!authKey || loadingRestore"
          />
        </div>
      </div>
    </div>
  </section>
</template>
