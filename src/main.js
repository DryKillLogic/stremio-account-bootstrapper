import { createApp } from 'vue';
import App from './App.vue';
import Notifications from './components/Notifications.vue';

const app = createApp(App);

// register globally
app.component('Notifications', Notifications);

app.mount('#app');