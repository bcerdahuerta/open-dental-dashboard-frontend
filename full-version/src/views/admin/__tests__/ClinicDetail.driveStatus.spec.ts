import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import ClinicDetail from '@/views/admin/ClinicDetail.vue';

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>();
  return {
    ...actual,
    useRoute: () => ({ params: { id: 'clinic-1' } })
  };
});

type DriveStatus = 'pending' | 'granted' | 'failed' | null;

const currentClinicRef = ref<any>(null);
const credentialsRef = ref<any[]>([]);
const loadingRef = ref(false);
const errorRef = ref<string | null>(null);
const clinicsList: any[] = [];

const clinicStoreMock = {
  currentClinic: currentClinicRef,
  credentials: credentialsRef,
  loading: loadingRef,
  error: errorRef,
  clinics: clinicsList,
  fetchClinic: vi.fn(),
  fetchCredentials: vi.fn(),
  fetchCatalogue: vi.fn(),
  fetchClinics: vi.fn(),
  retryDrivePermission: vi.fn(),
  updateClinic: vi.fn(),
  upsertCredential: vi.fn(),
  testConnection: vi.fn(),
  cloneConfig: vi.fn()
};

const writebackStoreMock = {
  fetchWritebackConfig: vi.fn(),
  saveWritebackConfig: vi.fn()
};

vi.mock('@/stores/clinics', () => ({
  useClinicStore: () => clinicStoreMock
}));

vi.mock('@/stores/writeback', () => ({
  useWritebackStore: () => writebackStoreMock
}));

function makeClinic(status: DriveStatus) {
  return {
    id: 'clinic-1',
    client_id: 'client-1',
    clinic_name: 'Clinic One',
    ccc_clinic_id: null,
    clinic_num: null,
    spreadsheet_id: null,
    folder_id: null,
    images_folder_id: 131,
    is_active: true,
    drive_permission_status: status,
    created_at: '2026-01-01T00:00:00Z'
  };
}

function mountClinicDetail() {
  return mount(ClinicDetail, {
    global: {
      stubs: {
        UiParentCard: { template: '<div><slot name="action" /><slot /></div>' },
        BenefitMappingsTab: true,
        FrequencyMappingsTab: true,
        AgeLimitMappingsTab: true,
        PipelineStepsTab: true,
        ProductsTab: true,
        VDialog: { template: '<div><slot /></div>' },
        VSnackbar: {
          props: ['modelValue', 'color'],
          template: '<div v-if="modelValue" :data-color="color"><slot /></div>'
        },
        teleport: true
      }
    }
  });
}

function findRetryButton(wrapper: any) {
  return wrapper
    .findAll('button')
    .find((btn: any) => btn.text().includes('Retry Permission'));
}

describe('ClinicDetail drive sharing status card', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    if (!window.visualViewport) {
      Object.defineProperty(window, 'visualViewport', {
        configurable: true,
        value: {
          width: 1280,
          height: 720,
          offsetLeft: 0,
          offsetTop: 0,
          pageLeft: 0,
          pageTop: 0,
          scale: 1,
          addEventListener: () => {},
          removeEventListener: () => {}
        }
      });
    }

    currentClinicRef.value = makeClinic('granted');
    credentialsRef.value = [];
    loadingRef.value = false;
    errorRef.value = null;
    clinicsList.splice(0, clinicsList.length);

    clinicStoreMock.fetchClinic.mockImplementation(async () => currentClinicRef.value);
    clinicStoreMock.fetchCredentials.mockResolvedValue(undefined);
    clinicStoreMock.fetchCatalogue.mockResolvedValue({ image_folders: [] });
    clinicStoreMock.fetchClinics.mockResolvedValue(undefined);
    clinicStoreMock.retryDrivePermission.mockResolvedValue({ drive_permission_status: 'pending' });

    writebackStoreMock.fetchWritebackConfig.mockResolvedValue({
      writeback_mode: 'manual',
      quiet_start: null,
      quiet_end: null,
      timezone: 'America/Chicago',
      audit_column: 'Update Status',
      upload_column: 'Upload Status',
      upload_done_value: 'Done By DR',
      include_not_found: false
    });
    writebackStoreMock.saveWritebackConfig.mockResolvedValue(undefined);
  });

  it('renders Drive Sharing Status card with neutral fallback for null status', async () => {
    currentClinicRef.value = makeClinic(null);
    const wrapper = mountClinicDetail();

    await nextTick();

    const text = wrapper.text();
    expect(text).toContain('Drive Sharing Status');
    expect(text).toContain('Not Configured');
    expect(text).toContain('Drive sharing is not configured for this clinic yet');
    expect(findRetryButton(wrapper)).toBeUndefined();
  });

  it('shows retry button for pending and failed, hides for granted and null', async () => {
    const statuses: Array<{ status: DriveStatus; visible: boolean }> = [
      { status: 'pending', visible: true },
      { status: 'failed', visible: true },
      { status: 'granted', visible: false },
      { status: null, visible: false }
    ];

    for (const { status, visible } of statuses) {
      currentClinicRef.value = makeClinic(status);
      const wrapper = mountClinicDetail();
      await nextTick();

      const retryButton = findRetryButton(wrapper);
      if (visible) {
        expect(retryButton).toBeDefined();
      } else {
        expect(retryButton).toBeUndefined();
      }

      wrapper.unmount();
    }
  });

  it('disables retry button while retry is in flight', async () => {
    currentClinicRef.value = makeClinic('failed');

    let resolveRetry: (() => void) | undefined;
    const retryPromise = new Promise<void>((resolve) => {
      resolveRetry = resolve;
    });
    clinicStoreMock.retryDrivePermission.mockReturnValue(retryPromise);

    const wrapper = mountClinicDetail();
    await nextTick();

    const retryButton = findRetryButton(wrapper);
    expect(retryButton).toBeDefined();

    await retryButton!.trigger('click');
    await nextTick();

    expect(clinicStoreMock.retryDrivePermission).toHaveBeenCalledWith('clinic-1');
    expect(retryButton!.attributes('disabled')).toBeDefined();

    resolveRetry?.();
    await retryPromise;
    await nextTick();

    expect(retryButton!.attributes('disabled')).toBeUndefined();
  });

  it('shows success feedback when retry succeeds', async () => {
    currentClinicRef.value = makeClinic('failed');
    clinicStoreMock.retryDrivePermission.mockResolvedValue({ drive_permission_status: 'pending' });

    const wrapper = mountClinicDetail();
    await nextTick();

    const retryButton = findRetryButton(wrapper);
    await retryButton!.trigger('click');
    await nextTick();

    expect(wrapper.text()).toContain('Drive permission retry requested successfully');
  });

  it('shows warning feedback when retry returns 403', async () => {
    currentClinicRef.value = makeClinic('failed');
    clinicStoreMock.retryDrivePermission.mockRejectedValue({ status: 403, message: 'Forbidden' });

    const wrapper = mountClinicDetail();
    await nextTick();

    const retryButton = findRetryButton(wrapper);
    await retryButton!.trigger('click');
    await nextTick();

    expect(wrapper.text()).toContain('You do not have permission to retry Drive sharing for this clinic');
  });
});
