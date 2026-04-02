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
        clinic_name: 'Clinic Ready',
        ccc_clinic_id: null,
        clinic_num: null,
        spreadsheet_id: null,
        folder_id: null,
        images_folder_id: 131,
        is_active: true,
        drive_permission_status: 'granted',
        folder_drive_permission_status: 'granted',
        created_at: '2026-01-01T00:00:00Z'
      },
      {
        id: 'clinic-2',
        client_id: 'client-1',
        clinic_name: 'Clinic Failed Precedence',
        ccc_clinic_id: null,
        clinic_num: null,
        spreadsheet_id: null,
        folder_id: null,
        images_folder_id: 131,
        is_active: true,
        drive_permission_status: 'failed',
        folder_drive_permission_status: 'pending',
        created_at: '2026-01-01T00:00:00Z'
      },
      {
        id: 'clinic-3',
        client_id: 'client-1',
        clinic_name: 'Clinic Partial Pending',
        ccc_clinic_id: null,
        clinic_num: null,
        spreadsheet_id: null,
        folder_id: null,
        images_folder_id: 131,
        is_active: true,
        drive_permission_status: 'granted',
        folder_drive_permission_status: 'pending',
        created_at: '2026-01-01T00:00:00Z'
      },
      {
        id: 'clinic-4',
        client_id: 'client-1',
        clinic_name: 'Clinic Partial Null',
        ccc_clinic_id: null,
        clinic_num: null,
        spreadsheet_id: null,
        folder_id: null,
        images_folder_id: 131,
        is_active: true,
        drive_permission_status: 'granted',
        folder_drive_permission_status: null,
        created_at: '2026-01-01T00:00:00Z'
      },
      {
        id: 'clinic-5',
        client_id: 'client-1',
        clinic_name: 'Clinic Pending',
        ccc_clinic_id: null,
        clinic_num: null,
        spreadsheet_id: null,
        folder_id: null,
        images_folder_id: 131,
        is_active: true,
        drive_permission_status: 'pending',
        folder_drive_permission_status: 'pending',
        created_at: '2026-01-01T00:00:00Z'
      },
      {
        id: 'clinic-6',
        client_id: 'client-1',
        clinic_name: 'Clinic Unconfigured',
        ccc_clinic_id: null,
        clinic_num: null,
        spreadsheet_id: null,
        folder_id: null,
        images_folder_id: 131,
        is_active: true,
        drive_permission_status: null,
        folder_drive_permission_status: null,
        created_at: '2026-01-01T00:00:00Z'
      }
    ];
  });

  it('renders one summary chip per row and hides Sheet/Folder labels', async () => {
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

    const clinicNames = [
      'Clinic Ready',
      'Clinic Failed Precedence',
      'Clinic Partial Pending',
      'Clinic Partial Null',
      'Clinic Pending',
      'Clinic Unconfigured'
    ];

    for (const clinicName of clinicNames) {
      const row = rowByClinicName(clinicName);
      expect(row).toBeDefined();
      expect(row?.findAll('.v-chip').length).toBe(2);
    }

    const text = wrapper.text();
    expect(text).toContain('Drive Status');
    expect(text).not.toContain('Sheet');
    expect(text).not.toContain('Folder');
  });

  it('maps summary label and semantics for all precedence states', async () => {
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

    const readyChip = driveChipByLabel(rowByClinicName('Clinic Ready'), 'Ready');
    expect(readyChip?.classes()).toContain('text-success');
    expect(readyChip?.classes()).toContain('bg-lightsuccess');

    const failedChip = driveChipByLabel(rowByClinicName('Clinic Failed Precedence'), 'Failed');
    expect(failedChip?.classes()).toContain('text-error');
    expect(failedChip?.classes()).toContain('bg-lighterror');

    const partialPendingChip = driveChipByLabel(rowByClinicName('Clinic Partial Pending'), 'Partial');
    expect(partialPendingChip?.classes()).toContain('text-warning');
    expect(partialPendingChip?.classes()).toContain('bg-lightwarning');

    const partialNullChip = driveChipByLabel(rowByClinicName('Clinic Partial Null'), 'Partial');
    expect(partialNullChip?.classes()).toContain('text-warning');
    expect(partialNullChip?.classes()).toContain('bg-lightwarning');

    const pendingChip = driveChipByLabel(rowByClinicName('Clinic Pending'), 'Pending');
    expect(pendingChip?.classes()).toContain('text-warning');
    expect(pendingChip?.classes()).toContain('bg-lightwarning');

    const unconfiguredChip = driveChipByLabel(rowByClinicName('Clinic Unconfigured'), 'Not Configured');
    expect(unconfiguredChip?.classes()).toContain('text-secondary');
    expect(unconfiguredChip?.classes()).toContain('bg-lightsecondary');
  });
});
