import { config } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

const vuetify = createVuetify({
  components,
  directives
});

config.global.plugins = [vuetify];

config.global.stubs = {
  transition: false,
  'transition-group': false
};

config.global.config = {
  compilerOptions: {
    isCustomElement: () => false
  }
};
