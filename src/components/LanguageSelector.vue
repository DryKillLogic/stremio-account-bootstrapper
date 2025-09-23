<script setup>
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { LanguageIcon } from '@heroicons/vue/24/outline';

const { locale } = useI18n();

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' }
];

const currentLanguage = computed(() => locale.value);

function changeLanguage(lang) {
  locale.value = lang;
  localStorage.setItem('language', lang);
}
</script>

<template>
  <div class="dropdown">
    <div tabindex="0" role="button" class="btn btn-ghost btn-circle">
      <LanguageIcon class="w-5 h-5" />
    </div>
    <ul
      tabindex="0"
      class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-36"
    >
      <li v-for="lang in languages" :key="lang.code">
        <a
          @click="changeLanguage(lang.code)"
          :class="{ active: currentLanguage === lang.code }"
          class="flex items-center gap-2"
        >
          <span class="text-lg">{{ lang.flag }}</span>
          {{ lang.name }}
        </a>
      </li>
    </ul>
  </div>
</template>
