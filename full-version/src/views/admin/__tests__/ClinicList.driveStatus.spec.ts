import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import ClinicList from '@/views/admin/ClinicList.vue';

const pushMock = vi.fn();

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push: pushMock })
}));

const clinicsRef = ref<any[]>([]);
const clinicLoadingRef = ref(false);
const clinicErrorRef = ref<string | null>(null);

const clinicStoreMock = {
  clinics: clinicsRef,
  loading: clinicLoadingRef,
  error: clinicErrorRef,
  fetchClinics: vi.fn(),
  createClinic: vi.fn(),
  upsertCredential: vi.fn()
};

const clientsRef = ref<any[]>([]);
const clientStoreMock = {
  clients: clientsRef,
  fetchClients: vi.fn()
};

vi.mock('@/stores/clinics', () => ({
  useClinicStore: () => clinicStoreMock
}));

vi.mock('@/stores/clients', () => ({
  useClientStore: () => clientStoreMock
}));

describe('ClinicList drive status column', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushMock.mockReset();

    clientsRef.value = [{ id: 'client-1', client_name: 'Client A' }];
    clinicsRef.value = [
      {
        id: 'clinic-1',
        client_id: 'client-1',
        clinic_name: 'Clinic Pending',
        ccc_clinic_id: null,
        clinic_num: null,
        spreadsheet_id: null,
        folder_id: null,
        images_folder_id: 131,
        is_active: true,
        drive_permission_status: 'pending',
        created_at: '2026-01-01T00:00:00Z'
      },
      {
        id: 'clinic-2',
        client_id: 'client-1',
        clinic_name: 'Clinic Granted',
        ccc_clinic_id: null,
        clinic_num: null,
        spreadsheet_id: null,
        folder_id: null,
        images_folder_id: 131,
        is_active: true,
        drive_permission_status: 'granted',
        created_at: '2026-01-01T00:00:00Z'
      },
      {
        id: 'clinic-3',
        client_id: 'client-1',
        clinic_name: 'Clinic Failed',
        ccc_clinic_id: null,
        clinic_num: null,
        spreadsheet_id: null,
        folder_id: null,
        images_folder_id: 131,
        is_active: true,
        drive_permission_status: 'failed',
        created_at: '2026-01-01T00:00:00Z'
      },
      {
        id: 'clinic-4',
        client_id: 'client-1',
        clinic_name: 'Clinic Unconfigured',
        ccc_clinic_id: null,
        clinic_num: null,
        spreadsheet_id: null,
        folder_id: null,
        images_folder_id: 131,
        is_active: true,
        drive_permission_status: null,
        created_at: '2026-01-01T00:00:00Z'
      }
    ];
  });

  it('renders Drive Status chip label mapping for all supported states', async () => {
    const wrapper = mount(ClinicList, {
      global: {
        stubs: {
          UiParentCard: { template: '<div><slot name="action" /><slot /></div>' },
          PlusIcon: true,
          SettingsIcon: true,
          LockIcon: true
        }
      }
    });

    const text = wrapper.text();
    expect(text).toContain('Drive Status');
    expect(text).toContain('Pending');
    expect(text).toContain('Granted');
    expect(text).toContain('Failed');
    expect(text).toContain('Not Configured');
  });

  it('maps Drive Status chip semantics (color/class) for each state', async () => {
    const wrapper = mount(ClinicList, {
      global: {
        stubs: {
          UiParentCard: { template: '<div><slot name="action" /><slot /></div>' },
          PlusIcon: true,
          SettingsIcon: true,
          LockIcon: true
        }
      }
    });

    const rowByClinicName = (clinicName: string) =>
      wrapper
        .findAll('tr')
        .find((row) => row.text().includes(clinicName));

    const driveChipByLabel = (row: any, label: string) =>
      row
        .findAll('.v-chip')
        .find((chip: any) => chip.text().includes(label));

    const pendingChip = driveChipByLabel(rowByClinicName('Clinic Pending'), 'Pending');
    expect(pendingChip?.classes()).toContain('text-warning');
    expect(pendingChip?.classes()).toContain('bg-lightwarning');

    const grantedChip = driveChipByLabel(rowByClinicName('Clinic Granted'), 'Granted');
    expect(grantedChip?.classes()).toContain('text-success');
    expect(grantedChip?.classes()).toContain('bg-lightsuccess');

    const failedChip = driveChipByLabel(rowByClinicName('Clinic Failed'), 'Failed');
    expect(failedChip?.classes()).toContain('text-error');
    expect(failedChip?.classes()).toContain('bg-lighterror');

    const unconfiguredChip = driveChipByLabel(rowByClinicName('Clinic Unconfigured'), 'Not Configured');
    expect(unconfiguredChip?.classes()).toContain('text-secondary');
    expect(unconfiguredChip?.classes()).toContain('bg-lightsecondary');
  });
});
