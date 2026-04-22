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

if (typeof globalThis.visualViewport === 'undefined') {
  const visualViewportMock = {
    width: 1280,
    height: 720,
    offsetTop: 0,
    offsetLeft: 0,
    pageTop: 0,
    pageLeft: 0,
    scale: 1,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  };

  Object.defineProperty(globalThis, 'visualViewport', {
    writable: true,
    value: visualViewportMock
  });
}

// Mock matchMedia for Vuetify components like v-switch that use media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })
});

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
