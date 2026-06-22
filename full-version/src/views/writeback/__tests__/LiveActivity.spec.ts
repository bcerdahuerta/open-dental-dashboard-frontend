import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, reactive, ref } from 'vue';
import LiveActivity from '@/views/writeback/LiveActivity.vue';

const routeState = reactive<{ query: Record<string, unknown> }>({ query: {} });
const replaceMock = vi.fn((location: { query?: Record<string, unknown> }) => {
  routeState.query = { ...(location.query ?? {}) };
});

const jobsRef = ref<Array<Record<string, unknown>>>([]);
const loadingRef = ref(false);
const errorRef = ref<string | null>(null);
const jobsPaginationRef = ref({ page: 1, per_page: 50, total: 2, pages: 1 });
const clientsRef = ref<Array<Record<string, unknown>>>([]);
const clinicsRef = ref<Array<Record<string, unknown>>>([]);

const writebackStoreMock = {
  jobs: jobsRef,
  loading: loadingRef,
  error: errorRef,
  jobsPagination: jobsPaginationRef,
  fetchJobs: vi.fn().mockResolvedValue(undefined),
  retryJob: vi.fn().mockResolvedValue(undefined),
  executeJob: vi.fn().mockResolvedValue(undefined),
};

const clientStoreMock = {
  clients: clientsRef,
  fetchClients: vi.fn().mockResolvedValue(undefined),
};

const clinicStoreMock = {
  clinics: clinicsRef,
  fetchClinics: vi.fn().mockResolvedValue(undefined),
};

vi.mock('pinia', () => ({
  storeToRefs: <T>(store: T) => store,
}));

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock('@/stores/writeback', () => ({
  useWritebackStore: () => writebackStoreMock,
}));

vi.mock('@/stores/clients', () => ({
  useClientStore: () => clientStoreMock,
}));

vi.mock('@/stores/clinics', () => ({
  useClinicStore: () => clinicStoreMock,
}));

function makeJob(overrides: Record<string, unknown>) {
  return {
    id: 'job-default',
    clinic_id: 'clinic-1',
    clinic_name: 'Clinic One',
    patient_name: 'Patient One',
    row_index: 10,
    spreadsheet_id: 'sheet-1',
    sheet_tab: 'Apr 01',
    matched_profile: 'Default',
    status: 'PENDING',
    attempt: 1,
    max_attempts: 3,
    error_message: null,
    retryable: true,
    worker_id: null,
    priority: 10,
    execution_id: null,
    created_at: '2026-04-13T10:00:00Z',
    started_at: null,
    completed_at: null,
    ...overrides,
  };
}

function mountLiveActivity() {
  return mount(LiveActivity, {
    global: {
      stubs: {
        UiParentCard: { template: '<div><slot /></div>' },
        JobDetailDrawer: {
          props: ['modelValue', 'jobId'],
          emits: ['update:modelValue'],
          template:
            '<div data-testid="drawer" :data-open="String(modelValue)" :data-job-id="jobId"><button data-testid="drawer-close" @click="$emit(\'update:modelValue\', false)">Close</button></div>',
        },
        VRow: { template: '<div><slot /></div>' },
        VCol: { template: '<div><slot /></div>' },
        VSelect: { template: '<div />' },
        VSwitch: { template: '<div />' },
        VSpacer: { template: '<div />' },
        VAlert: { template: '<div><slot /></div>' },
        VChip: { template: '<span><slot /></span>' },
        VSnackbar: { template: '<div><slot /></div>' },
        VDataTableServer: {
          props: ['items'],
          emits: ['update:options'],
          template:
            '<div><div v-for="rawItem in items" :key="rawItem.id"><slot name="item.status" :item="rawItem" /><slot name="item.actions" :item="rawItem" /></div></div>',
        },
        VBtn: { template: '<button @click="$emit(\'click\', $event)"><slot /></button>' },
        RefreshIcon: true,
        FilterIcon: true,
        PlayerPlayIcon: true,
      },
    },
  });
}

describe('Writeback LiveActivity view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeState.query = {};
    jobsRef.value = [
      makeJob({ id: 'job-1', status: 'PENDING' }),
      makeJob({ id: 'job-2', status: 'FAILED' }),
      makeJob({ id: 'job-3', status: 'PARTIAL' }),
    ];
    clientsRef.value = [];
    clinicsRef.value = [];
  });

  it('opens drawer from ?jobId and clears query when drawer closes', async () => {
    routeState.query = { jobId: 'job-2' };
    const wrapper = mountLiveActivity();
    await nextTick();

    const drawer = wrapper.get('[data-testid="drawer"]');
    expect(drawer.attributes('data-open')).toBe('true');
    expect(drawer.attributes('data-job-id')).toBe('job-2');

    await wrapper.get('[data-testid="drawer-close"]').trigger('click');
    await nextTick();

    expect(replaceMock).toHaveBeenCalledWith({ query: {} });
    expect(routeState.query.jobId).toBeUndefined();
  });

  it('opens drawer from explicit View action and syncs query state', async () => {
    const wrapper = mountLiveActivity();
    await nextTick();

    const buttons = wrapper.findAll('button');
    await buttons.find((btn) => btn.text().includes('View'))?.trigger('click');
    await nextTick();

    expect(replaceMock).toHaveBeenCalledWith({ query: { jobId: 'job-1' } });
    expect(routeState.query.jobId).toBe('job-1');
    expect(wrapper.get('[data-testid="drawer"]').attributes('data-open')).toBe('true');
  });

  it('keeps actions on authoritative page: execute and retry without row side effects', async () => {
    const wrapper = mountLiveActivity();
    await nextTick();

    const buttons = wrapper.findAll('button');
    expect(wrapper.text()).toContain('Execute');
    expect(wrapper.text()).toContain('Retry');

    await buttons.find((btn) => btn.text().includes('Execute'))?.trigger('click');
    await nextTick();

    expect(writebackStoreMock.executeJob).toHaveBeenCalledWith('job-1');
    expect(routeState.query.jobId).toBeUndefined();
    expect(wrapper.get('[data-testid="drawer"]').attributes('data-open')).toBe('false');

    await buttons.find((btn) => btn.text().includes('Retry'))?.trigger('click');
    await nextTick();

    expect(writebackStoreMock.retryJob).toHaveBeenCalled();
    expect(routeState.query.jobId).toBeUndefined();
    expect(wrapper.get('[data-testid="drawer"]').attributes('data-open')).toBe('false');
  });

  it('shows no-appointment as terminal without retry action', async () => {
    jobsRef.value = [
      makeJob({
        id: 'job-no-appt',
        status: 'NO_APPOINTMENT',
        retryable: false,
        error_category: 'no_appointment',
      }),
    ];

    const wrapper = mountLiveActivity();
    await nextTick();

    expect(wrapper.text()).toContain('No Appointment');
    expect(wrapper.text()).not.toContain('Retry');
  });
});
