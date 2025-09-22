<script setup>
import { useI18n } from 'vue-i18n';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  QuestionMarkCircleIcon
} from '@heroicons/vue/24/outline';
import Instructions from './Instructions.vue';
const { t } = useI18n();
</script>

<template>
  <section id="features" class="max-w-4xl mx-auto p-4">
    <div class="alert alert-info my-4">
      <InformationCircleIcon class="w-5 h-5" />

      <button
        type="button"
        class="cursor-pointer"
        onclick="get_instructions.showModal()"
      >
        {{ t('instructions_summary') }}
      </button>
    </div>

    <div class="alert alert-warning">
      <ExclamationTriangleIcon class="w-5 h-5" />
      <span v-html="t('warning')"></span>
    </div>

    <Instructions />
  </section>
</template>
