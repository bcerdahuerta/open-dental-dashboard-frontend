import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import LiveActivityFeed from '@/components/dashboards/dental/LiveActivityFeed.vue';

const pushMock = vi.fn();

const jobsRef = ref<any[]>([]);
const loadingRef = ref(false);

const writebackStoreMock = {
  jobs: jobsRef,
  loading: loadingRef,
  fetchJobs: vi.fn(),
};

vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/stores/writeback', () => ({
  useWritebackStore: () => writebackStoreMock,
}));

describe('LiveActivityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jobsRef.value = [
      {
        id: 'job-123',
        patient_name: 'Jane Doe',
        matched_profile: 'Default',
        status: 'DONE',
        created_at: '2026-04-02T10:00:00Z',
      },
    ];
  });

  it('routes actions button to live activity with jobId query', async () => {
    const wrapper = mount(LiveActivityFeed, {
      global: {
        stubs: {
          EyeIcon: true,
          VChip: { template: '<span><slot /></span>' },
          VDataTable: {
            props: ['items'],
            template:
              '<div><div v-for="item in items" :key="item.id"><slot name="item.actions" :item="item" /></div></div>',
          },
          VBtn: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
        },
      },
    });

    await wrapper.find('button').trigger('click');

    expect(pushMock).toHaveBeenCalledWith({ name: 'WritebackLive', query: { jobId: 'job-123' } });
    expect(writebackStoreMock.fetchJobs).toHaveBeenCalled();
  });
});
