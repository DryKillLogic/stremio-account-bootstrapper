<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const props = defineProps({
  platform: { type: String, default: 'stremio' }
});
const platformLabel = computed(() =>
  props.platform === 'nuvio' ? 'Nuvio' : 'Stremio'
);
</script>

<template>
  <dialog id="get_instructions" class="modal">
    <div class="modal-box w-11/12 max-w-4xl">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
          ✕
        </button>
      </form>
      <h3 class="text-lg font-semibold">
        {{ $t('instructions_title') }}
      </h3>
      <div class="py-4 space-y-4">
        <ol class="list-decimal list-inside space-y-3 text-md">
          <li v-html="t('instructions_1', { platform: platformLabel })"></li>
          <li>{{ t('instructions_2') }}</li>
          <li v-html="t('instructions_3')"></li>
          <li>{{ t('instructions_4') }}</li>
          <li v-html="t('instructions_5')"></li>
          <li>{{ t('instructions_6') }}</li>
          <li>{{ t('instructions_7') }}</li>
          <li v-html="t('instructions_8')"></li>
          <li>{{ t('instructions_9') }}</li>
          <li>{{ t('instructions_10', { platform: platformLabel }) }}</li>
          <li>{{ t('instructions_11', { platform: platformLabel }) }}</li>
          <li>{{ t('instructions_12') }}</li>
        </ol>
      </div>
      <div class="modal-action">
        <form method="dialog">
          <button class="btn">{{ $t('close') }}</button>
        </form>
      </div>
    </div>
  </dialog>
</template>
