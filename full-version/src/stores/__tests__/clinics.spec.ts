import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useClinicStore } from '@/stores/clinics';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';

vi.mock('@/utils/helpers/fetch-wrapper', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('clinics store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('retries drive permission and patches current clinic/list status', async () => {
    const store = useClinicStore();
    store.currentClinic = {
      id: 'clinic-1',
      client_id: 'client-1',
      clinic_name: 'Clinic 1',
      ccc_clinic_id: null,
      clinic_num: null,
      spreadsheet_id: null,
      folder_id: null,
      images_folder_id: 131,
      is_active: true,
      drive_permission_status: 'failed',
      created_at: '2026-01-01T00:00:00Z'
    };
    store.clinics = [
      {
        id: 'clinic-1',
        client_id: 'client-1',
        clinic_name: 'Clinic 1',
        ccc_clinic_id: null,
        clinic_num: null,
        spreadsheet_id: null,
        folder_id: null,
        images_folder_id: 131,
        is_active: true,
        drive_permission_status: 'failed',
        created_at: '2026-01-01T00:00:00Z'
      }
    ];

    vi.mocked(fetchWrapper.post).mockResolvedValue({
      clinic_id: 'clinic-1',
      drive_permission_status: 'pending'
    });

    const response = await store.retryDrivePermission('clinic-1');

    expect(fetchWrapper.post).toHaveBeenCalledWith(
      expect.stringContaining('/clinics/clinic-1/drive-permission/retry'),
      {}
    );
    expect(response.drive_permission_status).toBe('pending');
    expect(store.currentClinic?.drive_permission_status).toBe('pending');
    expect(store.clinics[0].drive_permission_status).toBe('pending');
  });

  it('falls back to null drive status when response is missing status', async () => {
    const store = useClinicStore();
    store.currentClinic = {
      id: 'clinic-2',
      client_id: 'client-1',
      clinic_name: 'Clinic 2',
      ccc_clinic_id: null,
      clinic_num: null,
      spreadsheet_id: null,
      folder_id: null,
      images_folder_id: 131,
      is_active: true,
      drive_permission_status: 'pending',
      created_at: '2026-01-01T00:00:00Z'
    };

    vi.mocked(fetchWrapper.post).mockResolvedValue({ clinic_id: 'clinic-2' });

    await store.retryDrivePermission('clinic-2');

    expect(store.currentClinic?.drive_permission_status).toBeNull();
  });
});
