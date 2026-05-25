import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';

import RobotMonitor from '@/views/extraction/RobotMonitor.vue';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';

vi.mock('@/utils/helpers/fetch-wrapper', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

const vuetifyStubs = {
  UiParentCard: { template: '<section><h3>{{ title }}</h3><slot name="action" /><slot /></section>', props: ['title'] },
  VRow: { template: '<div><slot /></div>' },
  VCol: { template: '<div><slot /></div>' },
  VAlert: { template: '<div><slot /></div>' },
  VAvatar: { template: '<div><slot /></div>' },
  VBtn: { template: '<button><slot name="prepend" /><slot /></button>' },
  VChip: { template: '<span><slot /></span>' },
  VDataTable: {
    props: ['items'],
    template: `
      <div>
        <div v-for="item in items" :key="item.id">
          <slot name="item.workstation_name" :item="item" />
          <slot name="item.status" :item="item" />
          <slot name="item.last_seen_at" :item="item" />
          <slot name="item.first_seen_at" :item="item" />
          <slot name="item.alerted_at" :item="item" />
        </div>
        <slot v-if="!items || !items.length" name="no-data" />
      </div>
    `
  },
};

describe('RobotMonitor', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('loads robot workstations and renders summary counters', async () => {
    vi.mocked(fetchWrapper.get).mockResolvedValue([
      {
        id: 'rw-1',
        workstation_name: 'MINT-OPS-01',
        status: 'HEALTHY',
        first_seen_at: '2026-05-22T10:00:00Z',
        last_seen_at: new Date().toISOString(),
        alerted_stale: false,
        alerted_at: null,
        last_recovered_at: null,
        created_at: '2026-05-22T10:00:00Z',
        updated_at: '2026-05-22T10:10:00Z'
      },
      {
        id: 'rw-2',
        workstation_name: 'MINT-OPS-02',
        status: 'STALE',
        first_seen_at: '2026-05-22T10:00:00Z',
        last_seen_at: '2026-05-22T08:00:00Z',
        alerted_stale: true,
        alerted_at: '2026-05-22T09:00:00Z',
        last_recovered_at: null,
        created_at: '2026-05-22T10:00:00Z',
        updated_at: '2026-05-22T09:00:00Z'
      }
    ]);

    const wrapper = mount(RobotMonitor, {
      global: { stubs: vuetifyStubs }
    });

    await flushPromises();

    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/robots/workstations'));
    expect(wrapper.text()).toContain('Workstation Heartbeats');
    expect(wrapper.text()).toContain('MINT-OPS-01');
    expect(wrapper.text()).toContain('MINT-OPS-02');
    expect(wrapper.text()).toContain('Online');
    expect(wrapper.text()).toContain('Stale');
    expect(wrapper.text()).toContain('ago');
    expect(wrapper.text()).toContain('2');
    expect(wrapper.text()).toContain('1');
  });
});
