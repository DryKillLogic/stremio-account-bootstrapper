import './style.css';
import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';
import { inject } from '@vercel/analytics';
import App from './App.vue';
import Notifications from './components/Notifications.vue';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import nl from './locales/nl.json';

inject();

const supported = ['en', 'es', 'fr', 'it', 'de', 'pt', 'nl'] as const;
type SupportedLang = (typeof supported)[number];
let savedLang = (localStorage.getItem('language') as SupportedLang) || '';
if (!savedLang) {
  const nav =
    (navigator.languages && navigator.languages[0]) ||
    navigator.language ||
    'en';
  const primary = String(nav).split('-')[0];
  savedLang = supported.includes(primary as SupportedLang)
    ? (primary as SupportedLang)
    : 'en';
  localStorage.setItem('language', savedLang);
}

const messages = {
  en,
  es,
  fr,
  it,
  de,
  pt,
  nl
} as unknown as Record<string, any>;

const i18n = createI18n({
  legacy: false,
  locale: savedLang,
  messages
} as any);

const app = createApp(App);

app.component('Notifications', Notifications as any);

app.use(i18n).mount('#app');
