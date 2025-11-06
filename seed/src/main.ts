import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import vuetify from './plugins/vuetify';
import '@/scss/style.scss';
import { PerfectScrollbarPlugin } from 'vue3-perfect-scrollbar';
import VueTablerIcons from 'vue-tabler-icons';
//Mock Api data
import { fakeBackend } from '@/utils/helpers/fake-backend';

//i18
import { createI18n } from 'vue-i18n';

import messages from '@/utils/locales/messages';

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: messages,
  silentTranslationWarn: true,
  silentFallbackWarn: true
});

const app = createApp(App);
fakeBackend();
app.use(router);
app.use(PerfectScrollbarPlugin);
app.use(createPinia());
app.use(VueTablerIcons);
app.use(i18n);
app.use(vuetify).mount('#app');
