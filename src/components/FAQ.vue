<script setup>
import { useI18n } from 'vue-i18n';
import AddonsList from './AddonsList.vue';
const { t } = useI18n();
</script>

<template>
  <section id="faq" class="p-4">
    <h3 class="text-2xl font-bold mb-6">{{ t('faq_title') }}</h3>
    <div class="space-y-4">
      <details class="collapse collapse-arrow border border-base-300">
        <summary class="collapse-title text-lg font-medium cursor-pointer">
          {{ t('what_does_it_do_title') }}
        </summary>
        <div class="collapse-content">
          <p v-html="t('what_does_it_do_desc')" class="text-base"></p>
        </div>
      </details>
      <details class="collapse collapse-arrow border border-base-300">
        <summary class="collapse-title text-lg font-medium cursor-pointer">
          {{ t('which_addons_title') }}
        </summary>
        <div class="collapse-content space-y-2">
          <AddonsList />
        </div>
      </details>
      <details class="collapse collapse-arrow border border-base-300">
        <summary
          id="debrid"
          class="collapse-title text-lg font-medium cursor-pointer"
        >
          {{ t('faq_debrid_summary') }}
        </summary>
        <div class="collapse-content space-y-2">
          <p class="text-base">{{ t('faq_debrid_desc1') }}</p>
          <p class="text-base">{{ t('faq_debrid_desc2') }}</p>
          <ul class="list-disc list-inside ml-4 text-base">
            <li>{{ t('faq_debrid_benefit1') }}</li>
            <li>{{ t('faq_debrid_benefit2') }}</li>
            <li>{{ t('faq_debrid_benefit3') }}</li>
            <li>{{ t('faq_debrid_benefit4') }}</li>
          </ul>
          <p>
            <i class="text-sm text-gray-500">{{ t('faq_debrid_note') }}</i>
          </p>
        </div>
      </details>
      <details class="collapse collapse-arrow border border-base-300">
        <summary class="collapse-title text-lg font-medium cursor-pointer">
          {{ t('faq_next_summary') }}
        </summary>
        <div class="collapse-content">
          <p class="text-base">
            {{ t('faq_next_desc1') }}
            <a
              href="https://stremio-addons.net"
              target="_blank"
              class="link link-primary"
              >{{ t('faq_next_addons_link') }}</a
            >.
          </p>
        </div>
      </details>
    </div>
  </section>
</template>
