<script setup>
import { ref } from 'vue';
import { getAddonCollection, setAddonCollection } from '../api/stremioApi';
import { format } from 'date-fns';
import { useI18n } from 'vue-i18n';
import { addNotification } from '../composables/useNotifications';
import { useAnalytics } from '../composables/useAnalytics';

const { stremioAuthKey } = defineProps({
  stremioAuthKey: { type: String }
});

const { t } = useI18n();
const loadingBackup = ref(false);
const loadingRestore = ref(false);
const error = ref(null);
const fileInputRef = ref(null);
const { track } = useAnalytics();

function backupConfig() {
  loadingBackup.value = true;
  error.value = null;

  getAddonCollection(stremioAuthKey)
    .then((data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stremio-addons-config-${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      addNotification(t('backup_saved'), 'success');
      track('backup_config_click', {
        title: 'Backup config'
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
  if (!stremioAuthKey) return;
  fileInputRef.value?.click();
}

async function restoreConfigFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!stremioAuthKey) {
    event.target.value = '';
    return;
  }

  loadingRestore.value = true;
  error.value = null;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    const addonsPayload = parsed?.result?.addons;

    if (!addonsPayload) {
      addNotification(t('invalid_backup_file'), 'error');
      throw new Error(t('invalid_backup_file'));
    }

    await setAddonCollection(addonsPayload, stremioAuthKey);
    addNotification(t('restore_successful'), 'success');
    track('restore_config_click', {
      title: 'Restore config'
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
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <button
            class="btn btn-primary w-full"
            @click="backupConfig"
            :disabled="!stremioAuthKey || loadingBackup"
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
            :disabled="!stremioAuthKey || loadingRestore"
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
            :disabled="!stremioAuthKey || loadingRestore"
          />
        </div>
      </div>
    </div>
  </section>
</template>
