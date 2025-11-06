import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import vuetify from './plugins/vuetify';
import '@/scss/style.scss';
import { PerfectScrollbarPlugin } from 'vue3-perfect-scrollbar';
import VueApexCharts from 'vue3-apexcharts';
import VueTablerIcons from 'vue-tabler-icons';
//Mock Api data
import './_mockApis';
import { fakeBackend } from '@/utils/helpers/fake-backend';

import { vMaska } from 'maska/vue';
// print
import print from 'vue3-print-nb';

// @ts-expect-error: vue3-easy-data-table doesn't have default export
import DataTable from 'vue3-easy-data-table';

//i18
import { createI18n } from 'vue-i18n';
import messages from '@/utils/locales/messages';

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: messages,
  silentTranslationWarn: true,
  silentFallbackWarn: true
});

const app = createApp(App);
fakeBackend();
app.use(router);
app.component('EasyDataTable', DataTable);
app.use(PerfectScrollbarPlugin);
app.use(createPinia());
app.use(VueTablerIcons);
app.use(print);
app.use(i18n);
app.directive('maska', vMaska);
app.use(VueApexCharts);
app.use(vuetify).mount('#app');
