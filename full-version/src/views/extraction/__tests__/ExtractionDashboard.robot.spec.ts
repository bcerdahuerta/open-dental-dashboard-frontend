import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';

import ExtractionDashboard from '@/views/extraction/ExtractionDashboard.vue';
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

const stubs = {
  UiParentCard: { template: '<section><h3>{{ title }}</h3><slot name="action" /><slot /></section>', props: ['title'] },
  VRow: { template: '<div><slot /></div>' },
  VCol: { template: '<div><slot /></div>' },
  VAlert: { template: '<div><slot /></div>' },
  VAvatar: { template: '<div><slot /></div>' },
  VBtn: { template: '<button><slot /></button>' },
  VChip: { template: '<span><slot /></span>' },
  VDataTable: { template: '<div />' },
  VSelect: { template: '<div />' },
  VDialog: { template: '<div />' },
  VCard: { template: '<div><slot /></div>' },
  VCardText: { template: '<div><slot /></div>' },
  VCardTitle: { template: '<div><slot /></div>' },
  VCardActions: { template: '<div><slot /></div>' },
  VTextField: { template: '<div />' },
  VSnackbar: { template: '<div />' }
};

describe('ExtractionDashboard robot summary', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(fetchWrapper.get).mockImplementation(async (url: string) => {
      if (url.includes('/robots/workstations')) {
        return [
          {
            id: 'rw-1',
            workstation_name: 'MINT-OPS-01',
            status: 'HEALTHY',
            first_seen_at: '2026-05-22T10:00:00Z',
            last_seen_at: '2026-05-22T10:10:00Z',
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
        ];
      }
      if (url.includes('/extractions/runs')) return { items: [], page: 1, per_page: 20, total: 0, pages: 0 };
      return [];
    });
  });

  it('loads robot health counts into the extraction dashboard card', async () => {
    const wrapper = mount(ExtractionDashboard, {
      global: { stubs }
    });

    await flushPromises();

    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/robots/workstations'));
    expect(wrapper.text()).toContain('Robot Health');
    expect(wrapper.text()).toContain('1/2 online');
    expect(wrapper.text()).toContain('1 stale workstations');
  });
});
