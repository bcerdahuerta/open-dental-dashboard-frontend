import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import JobQueue from '@/views/writeback/JobQueue.vue';

const clientsRef = ref<any[]>([]);
const clinicsRef = ref<any[]>([]);
const clinicStatsMapRef = ref<Record<string, any>>({});
const circuitBreakerStatusesRef = ref<Record<string, any>>({});

const writebackStoreMock = {
  clinicStatsMap: clinicStatsMapRef,
  circuitBreakerStatuses: circuitBreakerStatusesRef,
  fetchCircuitBreakerStatus: vi.fn(),
  fetchClinicStats: vi.fn(),
  fetchWritebackConfig: vi.fn(),
  previewReadyRows: vi.fn(),
  syncClinic: vi.fn(),
};

const clientStoreMock = {
  clients: clientsRef,
  fetchClients: vi.fn(),
};

const clinicStoreMock = {
  clinics: [] as any[],
  fetchClinics: vi.fn(),
};

vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
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

function mountJobQueue() {
  return mount(JobQueue, {
    global: {
      stubs: {
        UiParentCard: { template: '<div><slot /></div>' },
        VRow: { template: '<div><slot /></div>' },
        VCol: { template: '<div><slot /></div>' },
        VCard: { template: '<div><slot /></div>' },
        VCardText: { template: '<div><slot /></div>' },
        VBtn: { template: '<button><slot /></button>' },
        VChip: { template: '<span><slot /></span>' },
        VAvatar: { template: '<span><slot /></span>' },
        VAlert: { template: '<div><slot /></div>' },
        VDialog: { template: '<div><slot /></div>' },
        VDataTable: { template: '<div><slot /></div>' },
        VSelect: { template: '<select></select>' },
        VProgressCircular: { template: '<div />' },
        VBadge: { template: '<span><slot /></span>' },
        VSpacer: { template: '<span />' },
      },
    },
  });
}

describe('JobQueue watch health chips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientsRef.value = [{ id: 'client-1', client_name: 'Client One' }];
    clinicsRef.value = [{ id: 'clinic-1', clinic_name: 'Clinic One', is_active: true }];
    clinicStoreMock.clinics = clinicsRef.value;
    clinicStatsMapRef.value = {
      'clinic-1': {
        PENDING: 0,
        POLLING: 0,
        EXTRACTING: 0,
        EXECUTING: 0,
        DONE: 0,
        FAILED: 0,
        total: 0,
      },
    };
    circuitBreakerStatusesRef.value = {};

    clinicStoreMock.fetchClinics.mockImplementation(async () => {
      clinicStoreMock.clinics = clinicsRef.value;
    });
    writebackStoreMock.fetchCircuitBreakerStatus.mockImplementation(async () => {});
    writebackStoreMock.fetchClinicStats.mockImplementation(async () => {});
    writebackStoreMock.previewReadyRows.mockResolvedValue([]);
    writebackStoreMock.syncClinic.mockResolvedValue({ jobs_created: 0, jobs_deduplicated: 0 });
  });

  it('shows degraded chips when automatic but watch expired', async () => {
    writebackStoreMock.fetchWritebackConfig.mockResolvedValue({
      writeback_mode: 'automatic',
      quiet_start: null,
      quiet_end: null,
      timezone: 'America/Chicago',
      audit_column: 'Update Status',
      upload_column: 'Upload Status',
      upload_done_value: 'Done By DR',
      include_not_found: false,
      watch_health: {
        status: 'expired',
        expires_at: '2026-01-01T00:00:00+00:00',
        automatic_healthy: false,
      },
    });

    const wrapper = mountJobQueue();
    await nextTick();

    (wrapper.vm as any).filterClientId = 'client-1';
    await (wrapper.vm as any).onClientChange('client-1');
    await nextTick();
    await nextTick();

    const text = wrapper.text();
    expect(text).toContain('Watch Expired');
    expect(text).toContain('Automatic Degraded');
    expect(text).not.toContain('Automatic Healthy');
  });

  it('shows no-watch degraded chips when automatic and watch status is none', async () => {
    writebackStoreMock.fetchWritebackConfig.mockResolvedValue({
      writeback_mode: 'automatic',
      quiet_start: null,
      quiet_end: null,
      timezone: 'America/Chicago',
      audit_column: 'Update Status',
      upload_column: 'Upload Status',
      upload_done_value: 'Done By DR',
      include_not_found: false,
      watch_health: {
        status: 'none',
        expires_at: null,
        automatic_healthy: false,
      },
    });

    const wrapper = mountJobQueue();
    await nextTick();

    (wrapper.vm as any).filterClientId = 'client-1';
    await (wrapper.vm as any).onClientChange('client-1');
    await nextTick();
    await nextTick();

    const text = wrapper.text();
    expect(text).toContain('No Watch');
    expect(text).toContain('Automatic Degraded');
  });

  it('shows expiring-soon degraded chips when automatic and watch status is expiring_soon', async () => {
    writebackStoreMock.fetchWritebackConfig.mockResolvedValue({
      writeback_mode: 'automatic',
      quiet_start: null,
      quiet_end: null,
      timezone: 'America/Chicago',
      audit_column: 'Update Status',
      upload_column: 'Upload Status',
      upload_done_value: 'Done By DR',
      include_not_found: false,
      watch_health: {
        status: 'expiring_soon',
        expires_at: '2026-01-01T00:00:00+00:00',
        automatic_healthy: false,
      },
    });

    const wrapper = mountJobQueue();
    await nextTick();

    (wrapper.vm as any).filterClientId = 'client-1';
    await (wrapper.vm as any).onClientChange('client-1');
    await nextTick();
    await nextTick();

    const text = wrapper.text();
    expect(text).toContain('Watch Expiring Soon');
    expect(text).toContain('Automatic Degraded');
  });
});
