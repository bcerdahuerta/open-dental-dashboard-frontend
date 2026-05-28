import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';

import RobotMonitor from '@/views/extraction/RobotMonitor.vue';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import { useRobotStore } from '@/stores/robot';

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
  VBtn: {
    props: {
      disabled: { type: Boolean, default: false },
      loading: { type: Boolean, default: false }
    },
    emits: ['click'],
    template:
      '<button :disabled="disabled || loading" :data-loading="loading ? `true` : `false`" @click="$emit(`click`, $event)"><slot name="prepend" /><slot /></button>'
  },
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
          <slot name="item.actions" :item="item" />
        </div>
        <slot v-if="!items || !items.length" name="no-data" />
      </div>
    `
  },
  VDialog: { props: ['modelValue'], template: '<div v-if="modelValue"><slot /></div>' },
  VCard: { template: '<div><slot /></div>' },
  VCardTitle: { template: '<div><slot /></div>' },
  VCardText: { template: '<div><slot /></div>' },
  VCardActions: { template: '<div><slot /></div>' },
  VSpacer: { template: '<div />' }
};

function buildWorkstation(id: string, name: string, status: 'HEALTHY' | 'STALE') {
  return {
    id,
    workstation_name: name,
    status,
    first_seen_at: '2026-05-22T10:00:00Z',
    last_seen_at: '2026-05-22T10:10:00Z',
    alerted_stale: status === 'STALE',
    alerted_at: status === 'STALE' ? '2026-05-22T09:00:00Z' : null,
    last_recovered_at: null,
    created_at: '2026-05-22T10:00:00Z',
    updated_at: '2026-05-22T10:10:00Z'
  };
}

function findButtonByText(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('button').find((button) => button.text().trim() === text);
}

describe('RobotMonitor', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('loads robot workstations and renders summary counters', async () => {
    vi.mocked(fetchWrapper.get).mockResolvedValue([
      buildWorkstation('rw-1', 'MINT-OPS-01', 'HEALTHY'),
      buildWorkstation('rw-2', 'MINT-OPS-02', 'STALE')
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

  it('renders deregister action, warning copy, and calls store delete on confirm', async () => {
    vi.mocked(fetchWrapper.get).mockResolvedValue([buildWorkstation('rw-1', 'MINT-OPS-01', 'HEALTHY')]);
    const store = useRobotStore();
    const deleteSpy = vi.spyOn(store, 'deleteWorkstation').mockResolvedValue(undefined);

    const wrapper = mount(RobotMonitor, {
      global: { stubs: vuetifyStubs }
    });

    await flushPromises();

    const deregisterButton = findButtonByText(wrapper, 'Deregister');
    expect(deregisterButton).toBeTruthy();

    await deregisterButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Deregister Workstation');
    expect(wrapper.text()).toContain('may register again on the next heartbeat');

    const confirmButton = findButtonByText(wrapper, 'Deregister Workstation');
    expect(confirmButton).toBeTruthy();

    await confirmButton!.trigger('click');
    await flushPromises();

    expect(deleteSpy).toHaveBeenCalledWith('rw-1');
  });

  it('disables row actions while deleting and removes row after success', async () => {
    vi.mocked(fetchWrapper.get).mockResolvedValue([buildWorkstation('rw-9', 'MINT-OPS-09', 'STALE')]);

    let completeDelete!: () => void;
    let didCaptureDeleteResolver = false;
    vi.mocked(fetchWrapper.delete).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          completeDelete = () => resolve();
          didCaptureDeleteResolver = true;
        })
    );

    const wrapper = mount(RobotMonitor, {
      global: { stubs: vuetifyStubs }
    });

    await flushPromises();

    const rowActionButton = findButtonByText(wrapper, 'Deregister');
    expect(rowActionButton).toBeTruthy();
    await rowActionButton!.trigger('click');
    await flushPromises();

    const confirmButton = findButtonByText(wrapper, 'Deregister Workstation');
    expect(confirmButton).toBeTruthy();
    await confirmButton!.trigger('click');
    await flushPromises();

    const pendingRowActionButton = findButtonByText(wrapper, 'Deregister');
    const pendingConfirmButton = findButtonByText(wrapper, 'Removing...');
    expect(pendingRowActionButton?.attributes('disabled')).toBeDefined();
    expect(pendingConfirmButton?.attributes('disabled')).toBeDefined();

    if (!didCaptureDeleteResolver) {
      throw new Error('Expected delete resolver to be captured');
    }

    completeDelete();
    await flushPromises();

    expect(fetchWrapper.delete).toHaveBeenCalledWith(expect.stringContaining('/robots/workstations/rw-9'));
    expect(wrapper.text()).not.toContain('MINT-OPS-09');
  });
});
