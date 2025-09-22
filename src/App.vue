<script setup>
import { useI18n } from 'vue-i18n';
import { ref } from 'vue';
import Header from './components/Header.vue';
import DarkModeToggle from './components/DarkModeToggle.vue';
import LanguageSelector from './components/LanguageSelector.vue';
import Summary from './components/Summary.vue';
import Configuration from './components/Configuration.vue';
import FAQ from './components/FAQ.vue';
import ThankYou from './components/ThankYou.vue';
import Footer from './components/Footer.vue';
import Authentication from './components/Authentication.vue';
import Backup from './components/Backup.vue';
import Notifications from './components/Notifications.vue';

const { t } = useI18n();

const stremioAuthKey = ref('');

function setAuthKey(key) {
  stremioAuthKey.value = key;
}
</script>

<template>
  <header>
    <div class="flex justify-between items-center mt-4 px-4">
      <LanguageSelector />
      <DarkModeToggle />
    </div>
    <Header
      addonName="Stremio Account Bootstrapper"
      :addonSummary="t('addon_summary')"
      addonLogo="logo.png"
    />
  </header>
  <main class="max-w-4xl mx-auto">
    <Notifications />
    <Summary />
    <Authentication @auth-key="setAuthKey" />
    <Backup :stremioAuthKey="stremioAuthKey" />
    <Configuration :stremioAuthKey="stremioAuthKey" />
    <FAQ />
    <ThankYou />
  </main>
  <footer>
    <Footer />
  </footer>
</template>
