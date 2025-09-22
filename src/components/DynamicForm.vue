<template>
  <form @submit.prevent="handleSubmit" class="h-full overflow-y-auto">
    <div v-if="!isAdvancedMode" class="space-y-4">
      <div class="form-control">
        <label class="label" for="name">
          <span class="label-text">{{ t('edit_addons_name') }}</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          v-model="formModel.name"
          class="input input-bordered w-full"
        />
      </div>

      <div class="form-control">
        <label class="label" for="description">
          <span class="label-text">{{ t('edit_addons_description') }}</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows="4"
          v-model="formModel.description"
          class="textarea textarea-bordered w-full"
        ></textarea>
      </div>

      <div class="form-control">
        <label class="label" for="logo">
          <span class="label-text">{{ t('edit_addons_logo') }}</span>
        </label>
        <input
          id="logo"
          name="logo"
          type="text"
          v-model="formModel.logo"
          class="input input-bordered w-full"
        />
      </div>

      <div class="form-control">
        <label class="label" for="background">
          <span class="label-text">{{ t('edit_addons_background') }}</span>
        </label>
        <input
          id="background"
          name="background"
          type="text"
          v-model="formModel.background"
          class="input input-bordered w-full"
        />
      </div>

      <div
        v-if="formModel.catalogs && formModel.catalogs.length > 0"
        class="form-control"
      >
        <label class="label">
          <span class="label-text">{{ t('edit_addons_catalogs') }}</span>
        </label>
        <div class="space-y-3">
          <div
            v-for="(catalog, index) in formModel.catalogs"
            :key="catalog.type"
            class="flex flex-col md:flex-row md:items-center gap-3 p-3 bg-base-200 rounded-lg"
          >
            <label
              :for="'catalog-' + catalog.type"
              class="label-text font-semibold min-w-0 md:min-w-[100px] text-left"
            >
              {{ catalog.type }}
            </label>
            <input
              :id="'catalog-' + catalog.type"
              type="text"
              v-model="catalog.name"
              :placeholder="t('edit_addons_catalogName')"
              class="input input-bordered input-sm flex-1"
            />
            <button
              type="button"
              class="btn btn-error btn-sm"
              @click="removeCatalog(index)"
            >
              <TrashIcon class="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 pt-4">
        <button class="btn btn-primary" type="submit">
          {{ t('edit_addons_save') }}
        </button>
        <button type="button" class="btn btn-secondary" @click="toggleEditMode">
          {{ t('edit_addons_advanced_mode') }}
        </button>
      </div>
    </div>

    <div v-else class="space-y-4">
      <div class="form-control">
        <label class="label">
          <span class="label-text">{{ t('edit_addons_json_editor') }}</span>
        </label>
        <textarea
          v-model="jsonModel"
          rows="10"
          class="textarea textarea-bordered w-full font-mono text-sm"
        ></textarea>
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <button class="btn btn-primary" type="button" @click="updateFromJson">
          {{ t('edit_addons_save') }}
        </button>
        <button type="button" class="btn btn-secondary" @click="toggleEditMode">
          {{ t('edit_addons_classic_mode') }}
        </button>
      </div>
    </div>
  </form>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue';
import { useI18n } from 'vue-i18n';
import { TrashIcon } from '@heroicons/vue/24/outline';
import { addNotification } from '../composables/useNotifications';

const { t } = useI18n();

const props = defineProps({
  manifest: {
    type: Object,
    required: true
  }
});

const emits = defineEmits(['update-manifest']);

const isAdvancedMode = ref(false);
const formModel = ref({
  name: '',
  description: '',
  logo: '',
  background: '',
  catalogs: []
});
const jsonModel = ref('');

watch(
  () => props.manifest,
  (newManifest) => {
    formModel.value = JSON.parse(JSON.stringify(newManifest));
    jsonModel.value = JSON.stringify(newManifest, null, 2);
  },
  { immediate: true }
);

function toggleEditMode() {
  isAdvancedMode.value = !isAdvancedMode.value;
  if (!isAdvancedMode.value) {
    try {
      formModel.value = JSON.parse(jsonModel.value);
    } catch (e) {
      addNotification(t('edit_addons_invalid_json'), 'error');
    }
  }
}

function handleSubmit() {
  emits('update-manifest', formModel.value);
}

function removeCatalog(index) {
  if (Array.isArray(formModel.value.catalogs)) {
    formModel.value.catalogs.splice(index, 1);
  }
}

function updateFromJson() {
  try {
    formModel.value = JSON.parse(jsonModel.value);
    emits('update-manifest', formModel.value);
    isAdvancedMode.value = false;
  } catch (e) {
    addNotification(t('edit_addons_invalid_json'), 'error');
  }
}
</script>
