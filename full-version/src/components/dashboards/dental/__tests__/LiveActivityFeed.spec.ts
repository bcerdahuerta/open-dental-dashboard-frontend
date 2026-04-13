import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import LiveActivityFeed from '@/components/dashboards/dental/LiveActivityFeed.vue';

const pushMock = vi.fn();

const jobsRef = ref<Array<Record<string, unknown>>>([]);
const loadingRef = ref(false);

const writebackStoreMock = {
  jobs: jobsRef,
  loading: loadingRef,
  fetchJobs: vi.fn(),
};

vi.mock('pinia', () => ({
  storeToRefs: <T>(store: T) => store,
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

  it('renders v2 and unknown statuses with authoritative chip semantics', () => {
    jobsRef.value = [
      { id: '1', patient_name: 'A', matched_profile: 'Default', status: 'EXTRACTED', created_at: '2026-04-02T10:00:00Z' },
      { id: '2', patient_name: 'B', matched_profile: 'Default', status: 'EXECUTED', created_at: '2026-04-02T10:00:00Z' },
      { id: '3', patient_name: 'C', matched_profile: 'Default', status: 'PARTIAL', created_at: '2026-04-02T10:00:00Z' },
      { id: '4', patient_name: 'D', matched_profile: 'Default', status: 'SYNCING', created_at: '2026-04-02T10:00:00Z' },
      { id: '5', patient_name: 'E', matched_profile: 'Default', status: 'SYNCED', created_at: '2026-04-02T10:00:00Z' },
      { id: '6', patient_name: 'F', matched_profile: 'Default', status: 'EXTRACT_FAILED', created_at: '2026-04-02T10:00:00Z' },
      { id: '7', patient_name: 'G', matched_profile: 'Default', status: 'SYNC_FAILED', created_at: '2026-04-02T10:00:00Z' },
      { id: '8', patient_name: 'H', matched_profile: 'Default', status: 'FUTURE_STATUS', created_at: '2026-04-02T10:00:00Z' },
    ];

    const wrapper = mount(LiveActivityFeed, {
      global: {
        stubs: {
          EyeIcon: true,
          VChip: {
            props: ['color'],
            template: '<span data-testid="status-chip" :data-color="color"><slot /></span>',
          },
          VDataTable: {
            props: ['items'],
            template:
              '<div><div v-for="item in items" :key="item.id"><slot name="item.status" :item="item" /></div></div>',
          },
        },
      },
    });

    const chips = wrapper.findAll('[data-testid="status-chip"]');
    expect(chips).toHaveLength(8);

    expect(chips[0].attributes('data-color')).toBe('info');
    expect(chips[1].attributes('data-color')).toBe('info');
    expect(chips[2].attributes('data-color')).toBe('orange');
    expect(chips[3].attributes('data-color')).toBe('primary');
    expect(chips[4].attributes('data-color')).toBe('success');
    expect(chips[5].attributes('data-color')).toBe('error');
    expect(chips[6].attributes('data-color')).toBe('error');
    expect(chips[7].attributes('data-color')).toBe('grey');
  });

  it('keeps inspect action routing to WritebackLive with jobId query', async () => {
    jobsRef.value = [
      {
        id: 'job-inspect',
        patient_name: 'Jane Doe',
        matched_profile: 'Default',
        status: 'PENDING',
        created_at: '2026-04-02T10:00:00Z',
      },
    ];

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

    expect(pushMock).toHaveBeenCalledWith({
      name: 'WritebackLive',
      query: { jobId: 'job-inspect' },
    });
  });

  it('keeps unknown-status rows inspectable through the eye action', async () => {
    jobsRef.value = [
      {
        id: 'job-unknown',
        patient_name: 'Future Patient',
        matched_profile: 'Default',
        status: 'FUTURE_STATUS',
        created_at: '2026-04-02T10:00:00Z',
      },
    ];

    const wrapper = mount(LiveActivityFeed, {
      global: {
        stubs: {
          EyeIcon: true,
          VChip: { template: '<span><slot /></span>' },
          VDataTable: {
            props: ['items'],
            template:
              '<div><div v-for="item in items" :key="item.id"><slot name="item.status" :item="item" /><slot name="item.actions" :item="item" /></div></div>',
          },
          VBtn: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
        },
      },
    });

    expect(wrapper.text()).toContain('FUTURE_STATUS');

    await wrapper.find('button').trigger('click');

    expect(pushMock).toHaveBeenCalledWith({
      name: 'WritebackLive',
      query: { jobId: 'job-unknown' },
    });
  });
});
