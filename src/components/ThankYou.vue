<template>
  <section id="thanks" class="p-4 pb-8">
    <h3 class="text-2xl font-bold mb-6">
      {{ t("credits_title") }}
    </h3>
    <p v-html="t('credits_text')"></p>
  </section>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();
</script>
