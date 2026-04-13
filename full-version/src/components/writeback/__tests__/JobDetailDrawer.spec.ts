import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, nextTick } from 'vue';
import JobDetailDrawer from '@/components/writeback/JobDetailDrawer.vue';

const selectedJobRef = ref<Record<string, unknown> | null>(null);
const jobsLoadingRef = ref(false);
const detailLoadingRef = ref(false);
const compensationEntriesRef = ref<Array<Record<string, unknown>>>([]);

const writebackStoreMock = {
  selectedJob: selectedJobRef,
  loading: jobsLoadingRef,
  detailLoading: detailLoadingRef,
  compensationEntries: compensationEntriesRef,
  fetchJobDetail: vi.fn(),
  fetchCompensationEntries: vi.fn(),
  retryJob: vi.fn(),
};

vi.mock('pinia', () => ({
  storeToRefs: <T>(store: T) => store,
}));

vi.mock('@/stores/writeback', () => ({
  useWritebackStore: () => writebackStoreMock,
}));

function mountDrawer(props: { modelValue: boolean; jobId: string | null }) {
  return mount(JobDetailDrawer, {
    props,
    global: {
      stubs: {
        UiParentCard: {
          props: ['title'],
          template: '<section><h3>{{ title }}</h3><slot /><template v-if="$slots.action"><slot name="action" /></template></section>',
        },
        VNavigationDrawer: { template: '<div><slot /></div>' },
        VProgressCircular: true,
        VToolbar: { template: '<div><slot /></div>' },
        VToolbarTitle: { template: '<div><slot /></div>' },
        VSpacer: { template: '<div />' },
        VChip: { template: '<span><slot /></span>' },
        VBtn: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
        VDivider: { template: '<hr />' },
        VList: { template: '<div><slot /></div>' },
        VListItem: { template: '<div><slot /></div>' },
        VListItemTitle: { template: '<div><slot /></div>' },
        VListItemSubtitle: { template: '<div><slot /></div>' },
        VAlert: { template: '<div><slot /></div>' },
        VTimeline: { template: '<div><slot /></div>' },
        VTimelineItem: { template: '<div><slot /></div>' },
        VCard: { template: '<div><slot /></div>' },
        VRow: { template: '<div><slot /></div>' },
        VCol: { template: '<div><slot /></div>' },
        VExpansionPanels: { template: '<div><slot /></div>' },
        VExpansionPanel: { template: '<div><slot /></div>' },
        VExpansionPanelTitle: { template: '<div><slot /></div>' },
        VExpansionPanelText: { template: '<div><slot /></div>' },
        RefreshIcon: true,
        XIcon: true,
        CircleCheckIcon: true,
        CircleDotIcon: true,
        ClockIcon: true,
        DatabaseIcon: true,
        ChevronDownIcon: true,
        ChevronUpIcon: true,
        CircleXIcon: true,
      },
    },
  });
}

describe('JobDetailDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jobsLoadingRef.value = false;
    detailLoadingRef.value = false;
    selectedJobRef.value = {
      id: 'job-42',
      clinic_id: 'clinic-1',
      clinic_name: 'Clinic One',
      patient_name: 'Jane Doe',
      row_index: 22,
      spreadsheet_id: 'sheet-1',
      sheet_tab: 'Apr 01',
      matched_profile: 'Default',
      status: 'SYNCED',
      attempt: 1,
      max_attempts: 3,
      error_message: null,
      retryable: true,
      worker_id: null,
      priority: 10,
      execution_id: 'exec-42',
      created_at: '2026-04-13T10:00:00Z',
      started_at: '2026-04-13T10:00:01Z',
      completed_at: '2026-04-13T10:00:02Z',
      execution: {
        id: 'exec-42',
        status: 'SUCCESS',
        started_at: '2026-04-13T10:00:01Z',
        completed_at: '2026-04-13T10:00:02Z',
        error_summary: null,
        step_logs: [
          {
            step_type: 'upload_docs',
            status: 'SUCCESS',
            duration_ms: 200,
            error_message: null,
            output: { uploaded: true },
          },
        ],
      },
    };
    compensationEntriesRef.value = [
      {
        id: 'ce-1',
        step_type: 'upload_docs',
        resource_type: 'benefit',
        resource_id: '123',
        status: 'RECORDED',
        before_state: { foo: 'bar' },
        after_state: { foo: 'baz' },
      },
    ];
  });

  it('loads job detail by jobId and fetches compensation for execution', async () => {
    mountDrawer({ modelValue: true, jobId: 'job-42' });
    await nextTick();

    expect(writebackStoreMock.fetchJobDetail).toHaveBeenCalledWith('job-42');
    expect(writebackStoreMock.fetchCompensationEntries).toHaveBeenCalledWith('exec-42');
  });

  it('renders Job Information, Execution Steps, and Compensation Log sections', () => {
    const wrapper = mountDrawer({ modelValue: true, jobId: 'job-42' });

    expect(wrapper.text()).toContain('Job Information');
    expect(wrapper.text()).toContain('Execution Steps');
    expect(wrapper.text()).toContain('Compensation Log');
  });

  it('emits update:modelValue=false when closed', async () => {
    const wrapper = mountDrawer({ modelValue: true, jobId: 'job-42' });

    await wrapper.find('button').trigger('click');

    const modelValueEvents = wrapper.emitted('update:modelValue');
    expect(modelValueEvents).toBeTruthy();
    expect(modelValueEvents?.[modelValueEvents.length - 1]).toEqual([false]);
  });

  it('uses detailLoading only and keeps content visible during jobs list refresh', async () => {
    const wrapper = mountDrawer({ modelValue: true, jobId: 'job-42' });

    expect(wrapper.text()).toContain('Job Information');

    jobsLoadingRef.value = true;
    await nextTick();
    expect(wrapper.text()).toContain('Job Information');

    // Simulate a list refresh happening in parallel: drawer should stay stable
    // because it no longer depends on shared list-loading state.
    await nextTick();
    expect(wrapper.text()).toContain('Job Information');
  });

  it('shows spinner only when detailLoading is true', async () => {
    detailLoadingRef.value = true;
    selectedJobRef.value = null;

    const wrapper = mountDrawer({ modelValue: true, jobId: 'job-42' });
    await nextTick();

    expect(wrapper.html()).toContain('v-progress-circular-stub');
    expect(wrapper.text()).not.toContain('Job Information');
  });
});
